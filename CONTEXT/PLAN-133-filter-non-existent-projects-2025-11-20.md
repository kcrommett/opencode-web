## Summary
- Scope: implement GitHub issue #133 (Option A) by filtering projects with missing worktree directories entirely on the client/UI layer without modifying the upstream OpenCode server API.
- Goal: keep the project picker (`src/app/_components/ui/project-picker.tsx`) clutter-free by hiding stale entries while guaranteeing the current project remains visible and responsive even if its directory is temporarily unavailable.
- Strategy: add an asynchronous filesystem validation step after `/project` fetches in `src/hooks/useOpenCode.ts`, persist the latest validation metadata in `localStorage`, surface directory-health signals to the picker, expose a manual refresh control, and update the UI to exclude stale entries while flagging the active project if it is missing.

## Context Capture
### Issue Overview
- The `/project` endpoint returns historical worktrees from storage even after their directories are deleted, so the picker shows dead entries (Issue #133).
- Acceptance criteria emphasize (a) client-side filtering, (b) minimal performance impact via async checks, (c) retaining access to existing/active projects, and (d) continuing to show the current project despite transient filesystem issues.

### Current Behavior & Architecture
- `src/lib/opencode-http-api.ts:920-927` defines `listProjects(directory?)` which simply proxies `GET /project` and returns every stored project.
- `src/hooks/useOpenCode.ts:3315-3354` loads projects once via `openCodeService.listProjects(currentPath)` and stores them in local state (`setProjects`). Additional refreshes happen after session creation in `src/hooks/useOpenCode.ts:2888-2926`.
- `Project` and `ProjectResponse` shapes live inside `src/hooks/useOpenCode.ts:217-227` & `:393-404` respectively; today they do not carry any filesystem-health metadata.
- `ProjectPicker` (`src/app/_components/ui/project-picker.tsx:1-205`) assumes every `projects` entry is selectable; there is no concept of filtering or showing validation errors.
- The TanStack server functions (`src/lib/opencode-server-fns.ts`) already wrap HTTP calls and can host Bun-powered helpers without touching the upstream OpenCode server; no filesystem helper exists yet.

### Constraints & Decisions
1. **Option A only**: keep the OpenCode server untouched; all filtering happens after `/project` results reach the web client.
2. **Client-visible, server-assisted**: Browser code cannot access the filesystem directly. Validation must be performed through a new TanStack server function that calls the **OpenCode HTTP API** (e.g., `listFiles`) to verify existence on the actual OpenCode server (which may be remote).
3. **Non-blocking UX**: validation must run asynchronously without blocking the picker, and it only runs when projects are initially loaded or when the user explicitly refreshes.
4. **Current project protection**: never drop the active project from UI state; instead mark it as "missing" and show contextual UX.
5. **State persistence**: persist the most recent validation map in `localStorage` so the picker can restore health signals between reloads without re-validating until the next load/refresh.
6. **Graceful degradation**: permission errors or transient IO failures should log to console (dev only) and treat the project as "unknown" rather than crashing the picker.
7. **Manual refresh UX**: provide an explicit "Refresh projects" affordance that triggers a new validation cycle on demand.

### Internal Reference Points
| Path | Responsibility | Notes |
| --- | --- | --- |
| src/lib/opencode-http-api.ts:920-927 | `/project` fetch wrapper | No filtering here per requirement. |
| src/hooks/useOpenCode.ts:217-227 & 393-404 | Local `Project`/`ProjectResponse` shapes | Need optional `status` metadata. |
| src/hooks/useOpenCode.ts:3315-3354 | `loadProjects()` | Primary hook for injecting validation & caching. |
| src/hooks/useOpenCode.ts:2888-2925 | Session creation flow | Secondary code path that refreshes project list. |
| src/app/_components/ui/project-picker.tsx:20-186 | Picker UI rendering | Must filter invalid projects while retaining current project row and highlight missing state. |
| src/lib/opencode-server-fns.ts | TanStack server function registry | Best location for filesystem validation helper that can call Bun APIs safely. |

### External Reference Research (`gh_grep`)
| Purpose | Git URL | Takeaway |
| --- | --- | --- |
| Directory Guard Patterns | https://github.com/continuedev/continue/blob/main/core/util/paths.ts#L52-L74 | Ensures directories exist (using `fs.existsSync` + mkdir) before use; demonstrates caching the resolved path to avoid repeated checks. |
| Workspace Presence Validation | https://github.com/cline/cline/blob/main/evals/cli/src/adapters/exercism.ts#L17-L53 | Explicitly verifies repositories exist before operating, and throws descriptive errors if missing—mirrors our need to confirm worktrees before showing them. |

These references reinforce the plan to (a) guard filesystem access centrally, (b) short-circuit repeated checks via caching, and (c) provide descriptive logging/errors instead of silent failures.

## Technical Specifications
### API & Transport Surface
| Endpoint | Method | Used from | Notes |
| --- | --- | --- | --- |
| `/project` | GET | `src/lib/opencode-http-api.ts:listProjects` | Returns `{ data: ProjectResponse[] }` without filesystem validation. |
| `/project/current` | GET | `getCurrentProject` (same file) | Needed to keep current project metadata synchronized. |
| New server fn `validateProjectWorktrees` (proposed) | POST | `src/lib/opencode-server-fns.ts` | Accepts `{ worktrees: string[] }`, returns `{ existing: Record<string, "ok"|"missing"|"error"> }`. Internally uses `opencode-http-api.ts`. |

### Data Models
```ts
// Extend existing types in src/hooks/useOpenCode.ts
interface Project {
  id: string;
  worktree: string;
  vcs?: string;
  createdAt?: Date;
  updatedAt?: Date;
  health?: "ok" | "missing" | "unknown"; // new optional flag used only client-side
  lastValidatedAt?: number; // epoch ms for cache busting / debugging
}
```
- `health` defaults to `"unknown"` until a validation result is returned.
- Validation cache maps `worktree` -> `{ status, timestamp, error? }` and is stored in `useRef` within `useOpenCode` to survive re-renders without causing loops.
- The current project will carry `health: "missing"` if the validator reports it missing; the picker uses that to show a warning badge but still renders the entry.

### Proposed Client-Side Validation Flow
1. Fetch `/project` via existing `loadProjects()` on initial app boot and whenever the user presses the new "Refresh projects" button.
2. Immediately set optimistic project list (health = `"unknown"`) so UI stays responsive while validation runs in the background.
3. Kick off `validateProjectWorktrees(worktrees: string[])` via the new server fn using `Promise.allSettled` semantics; simultaneously load any cached health map from `localStorage` to pre-populate UI hints.
4. Merge responses back into state:
   - Filter out `health === "missing"` entries unless `project.id === currentProject?.id`.
   - Preserve ordering from the original fetch.
   - Persist the latest `{ worktree: status }` map plus timestamp to `localStorage` for reuse across reloads (no TTL-driven invalidation; next validation occurs only on the next load/refresh event).
5. Surface derived data to the picker (`hasMissingProjects`, `currentProjectHealth`) for messaging and to show when cached data is being reused prior to a fresh validation response.

### Error Handling & Telemetry
- Wrap OpenCode API calls with `try/catch`; treat 404s or specific errors as "missing" and others as "unknown". Log errors in development builds via existing `debugLog` helper.
- Expose aggregated stats (counts of missing projects, last validation time, cache source) via optional `useOpenCode` return values for future observability and to power the refresh button's tooltip/state.

## Implementation Plan (Option A)
### Milestone 1 – Filesystem Validation Utility & Server Function
- [x] Implement `validateProjectWorktrees` server fn in `src/lib/opencode-server-fns.ts` using `createServerFn({ method: "POST" })` with payload `{ worktrees: string[] }` that:
  - Normalizes and deduplicates paths.
  - Uses `opencode-http-api.ts` (e.g., `listFiles` or `getFileStatus`) to check if the directory exists on the OpenCode server.
  - **Crucial**: Do NOT use local `fs` or `Bun.file` checks, as the OpenCode server may be on a different host.
  - Runs checks concurrently with a cap (e.g., 5 at a time) to avoid IO floods.
  - Returns structured results with `status` + optional `error` text per worktree.
- [x] Remove `src/lib/filesystem.ts` if it was created solely for local checks, or ensure it's not used for project validation.
- [x] Add unit/integration tests mocking the `opencode-http-api` responses to verify "missing" vs "ok" logic.

### Milestone 2 – Hook-Level Validation & Persistence (`src/hooks/useOpenCode.ts`)
- [x] Introduce a `useRef<Record<string, ValidationRecord>>` cache and helper `runWorktreeValidation(worktrees, reason)` that only executes on initial load or when explicitly triggered by the refresh button.
- [x] Load existing validation metadata from `localStorage` on hook initialization to hydrate UI state before making network calls, and persist new results back to `localStorage` after each validation run.
- [x] Update `loadProjects()` to:
  - Populate state immediately with fetched data + `health: "unknown"`.
  - Trigger validation after state is set, then merge results via a new `mergeProjectHealth(projects, healthMap)` function that filters missing entries.
- [x] Update other code paths that refresh projects (`createSession` flow, manual refreshes) to reuse the shared helper rather than duplicating logic.
- [x] Ensure the state setter keeps the `currentProject` entry even if validation returns `missing`, records `currentProjectHealth` for UI use, and logs debug information only when `process.env.NODE_ENV !== "production"`.

### Milestone 3 – Picker UX & Refresh Controls (`src/app/_components/ui/project-picker.tsx` + related UI shell)
- [x] Adjust the component props (and the context that supplies them) to include `health` + derived arrays (e.g., `visibleProjects`, `missingProjects`) plus callbacks for manual refresh actions.
- [x] Filter `projects` prop on the caller side so this component only receives already-filtered data; add defensive logic to ignore entries flagged as missing.
- [x] Add a clearly labeled "Refresh projects" button (or icon button with tooltip) within the picker shell that triggers the validation helper, shows a transient loading indicator, and is disabled while validation is in flight.
- [x] Show a subtle warning badge (e.g., `Badge variant="danger"`) if `currentProject?.health === "missing"`, with tooltip text explaining the directory could not be found.
- [x] Surface a footer message listing how many projects were hidden and reminding users they can refresh once directories return.

### Milestone 4 – QA, Docs, and Regression Safeguards
- [x] Document the new validation behavior in `docs/CONFIGURATION.md` or a dedicated troubleshooting section if needed.
- [x] Add automated checks (unit test or integration harness) that mocks server fn responses to ensure the UI filters as expected.
- [x] Manually verify scenarios: existing projects, deleted worktree, temporarily unavailable directory, permission error, and ensuring selection flows still work.

### Implementation Order & Dependencies
| Order | Milestone | Depends On | Output |
| --- | --- | --- | --- |
| 1 | Milestone 1 | None | Validated filesystem helper + server fn to call from client. |
| 2 | Milestone 2 | 1 | Hook-level caching & filtering producing enriched project list. |
| 3 | Milestone 3 | 2 | Updated picker UI reflecting filtered list & warnings. |
| 4 | Milestone 4 | 1-3 | Documentation + tests confirming acceptance criteria. |

## Validation Criteria
### Automated / Programmatic
- [ ] Server fn unit tests prove `existing`, `missing`, and `error` statuses are emitted correctly for test directories.
- [ ] Hook-level tests (or Jest-like component tests) confirm that feeding a validation map results in a filtered project array and preserved current project entry.
- [ ] Linting (`bun run lint`) and type-checking (`bun x tsc --noEmit`) succeed after the new types are added.

### Manual QA Scenarios
- [ ] Delete a known worktree directory, reload the UI, and confirm it disappears from the picker once validation completes.
- [ ] Temporarily rename the current project's directory and verify the picker still lists it with a warning badge.
- [ ] Induce a permission error (e.g., restrict directory access) and confirm the UI treats it as `unknown` without crashing.
- [ ] Observe network panel/logs to ensure validation requests are batched and not fired repeatedly without user action.

## Risks & Mitigations
- **Browser ↔ server coordination**: Must ensure TanStack server fn is callable from the browser bundle without leaking Node APIs; mitigate by isolating logic inside server fn and exposing a typed client helper.
- **Performance impact**: Even though validation now only runs on load and manual refresh, concurrency limits and async scheduling are still necessary to avoid blocking the UI.
- **Inaccurate path strings**: `worktree` values may be relative; normalize via `path.resolve` within the server fn and guard against path traversal.
- **User expectations**: Removing entries automatically might be surprising; mitigate by showing a counter/badge indicating how many entries were hidden and offering guidance, plus providing the refresh button for recovery.
- **LocalStorage persistence**: Guard against quota or parsing errors by catching exceptions and falling back to in-memory caches when storage is unavailable.

## Appendix – Reference Snippets
- Internal Bun filesystem usage example: `server.ts:230-251` already uses `const file = Bun.file(absolutePath); if (await file.exists()) { ... }`, which we can mirror in the new validation helper.
- External validation analogs collected via `gh_grep` (see links above) demonstrate wrapping filesystem checks with guard clauses and descriptive errors—useful guidance for shaping our helper responses.
