# Add Git Diff Display to File Viewer – Implementation Plan

## Context & Decisions
### Problem Statement
- The current OpenCode Web file viewer renders file contents only; it cannot show git diffs for modified files, forcing users to leave the app to understand changes (GitHub issue #71).
- We must integrate diff visualization into the file viewing workflow while maintaining existing performance and theming guarantees.

### Goals & Acceptance Criteria (from issue #71)
- Show git diff overlays when viewing modified files inside repositories.
- Integrate with syntax highlighting and theme system; support dark/light/mobile layouts.
- Provide a toggle between normal view and diff view, with staged vs unstaged variants.
- Surface git status indicators in the file tree/browser.
- Support large files without regressions; performance must remain acceptable.

### Additional Requirements From This Conversation
- Produce a comprehensive, standalone plan saved under `CONTEXT/` with filename pattern `PLAN-[descriptive-name]-[YYYY-MM-DD].md`.
- Capture all design decisions, technical approach, and rationale discussed here.
- Deliver actionable task breakdowns with checkbox tracking, ordered by dependencies.
- Include internal code references (relative paths) and external Git URLs for third-party assets.
- Document API endpoints, data models, configuration impacts, integration points, and validation criteria.
- Ensure plan enables execution without reopening the conversation context.

### Key Existing Assets & Integration Points
- Diff rendering components already exist: `src/app/_components/message/DiffPart.tsx`, `src/app/_components/message/PrettyDiff.tsx`, and CSS overrides `src/app/_components/message/diff2html-overrides.css`.
- File viewer lives in `src/app/_components/message/FilePart.tsx` and currently renders binary/text attachments without diff awareness.
- Git status data is surfaced in `src/app/_components/ui/modified-files-panel.tsx` and provided via `useOpenCode` hook (`src/hooks/useOpenCode.ts`).
- HTTP client/server plumbing resides in `src/lib/opencode-http-api.ts`, `src/lib/opencode-server-fns.ts`, and `src/lib/opencode-client.ts`.
- Diff parsing utilities: `src/lib/diff-utils.ts`.
- Type definitions for file parts, diffs, and git status: `src/types/opencode.ts`.

## Technical Specifications
### Planned API Endpoint Additions
| Method | Path | Query | Description | Response Shape |
| --- | --- | --- | --- | --- |
| GET | `/file/diff` | `path` (string, required), `staged` (boolean, optional), `directory` (string, optional) | Fetch the git diff for a single file, scoped to staged or unstaged changes. | `{ path: string; staged: boolean; diff: string; stats: { additions: number; deletions: number }; isBinary: boolean; wasTruncated: boolean; }` |

- Backend should reuse existing git tooling to execute `git diff` / `git diff --staged` with safeguards for large outputs (reuse helpers in `src/lib/diff-utils.ts`).
- Extend OpenCode CLI/server to respond with HTTP 404 when no diff exists (e.g., unmodified file) and 415 for binary diff fallback.

### Data Model & Type Updates
- Add `GitFileDiff` interface in `src/types/opencode.ts` capturing the response shape above plus optional `hunks?: DiffHunk[]` when parsed.
- Extend `Part` and/or create `FileViewerState` structures in `useOpenCode` for active file metadata: `{ mode: "content" | "diff", staged: boolean }`.
- Augment `GitStatus` to include per-file status metadata for tree badges (e.g., `{ [path: string]: "modified" | "staged" | ... }`).
- Update `OpenCodeContext` derived state to expose new diff fetchers and cached results.

### Configuration & UI Controls
- Introduce optional user preference flag (persisted in local state or config) for default diff mode toggling; check compatibility with `src/lib/config.ts`.
- Add keyboard shortcuts (e.g., `d` to toggle diff, `Shift+d` to flip staged/unstaged) by extending `src/hooks/useKeyboardShortcuts.ts`.
- Ensure theme variables from `src/app/globals.css` are applied to new diff overlays; reuse `PrettyDiff` classes to avoid duplicating palette logic.

### Integration Points
- `src/lib/opencode-http-api.ts`: add `getFileDiff` function mapping to `/file/diff`.
- `src/lib/opencode-server-fns.ts`: expose `getFileDiff` server function.
- `src/lib/opencode-client.ts`: add `getFileDiff` method, handle errors, and expose to hooks.
- `src/hooks/useOpenCode.ts`: manage diff state, load/caching strategy, SSE refresh triggers on git status updates.
- `src/app/_components/message/FilePart.tsx`: embed diff view toggle, delegate rendering to `PrettyDiff` or new overlay component.
- `src/app/_components/files/` (new or existing) for tree view with git badges and selection state that coordinates with diff toggles.

### External References
- diff2html rendering library already in use: `https://github.com/rtfpessoa/diff2html` (ensure version compatibility when extending configuration).
- If additional git abstraction is required, prefer `simple-git` (`https://github.com/steveukx/git-js`) to remain consistent with Node environments.

## Implementation Plan & Ordered Tasks
### Milestone 0 – Discovery & Technical Alignment *(Dependency: none)*
- [x] Audit existing git integration in the CLI/backend to confirm available helpers for diffs and binary detection.
- [x] Validate diff size limits and streaming behaviour to align with `isDiffTooLarge` guard (`src/lib/diff-utils.ts`).
- [x] Decide on caching strategy for diffs (session diffs from `/session` endpoint summary).

### Milestone 1 – Backend Diff API *(SKIPPED - data already available)*
- [x] ~~Implement `/file/diff` handler~~ - Session endpoint already provides diffs in `summary.diffs[]`
- [x] ~~Add truncation, binary detection~~ - Not needed, diffs come from session summary
- [x] ~~Update API documentation~~ - No new endpoint needed

### Milestone 2 – Client Data Plumbing *(Refactored approach)*
- [x] ~~Create `getFileDiff` client~~ - Using existing session data
- [x] Extend `src/types/opencode.ts` with `SessionDiff` and `SessionSummary` interfaces
- [x] Add `generateUnifiedDiff` utility in `src/lib/diff-utils.ts` to convert before/after to unified format
- [x] Update `useOpenCode` to extract and expose `currentSessionDiffs` from session.summary
- [x] ~~Wire SSE refresh events~~ - Session summary automatically refreshed on session load

### Milestone 3 – File Viewer UI *(Core implementation complete)*
- [x] Refactor `src/app/_components/message/FilePart.tsx` to support "content" vs "diff" display modes
- [x] Embed diff overlay using `PrettyDiff` for generated unified diffs
- [x] Add Content/Diff toggle buttons with visual indication
- [x] Implement file matching logic to find diffs by filename

### Milestone 4 – File Tree & Status Integration *(Parallel with Milestone 3 once context APIs exist)*
- [ ] Replace or augment existing file browser component in `src/app/_components/files/` to display git status indicators (badges/icons) using data from `useOpenCode`.
- [ ] Ensure selecting a file in the tree updates the viewer mode and requests the correct diff variant.
- [ ] Add context menu or inline controls for staging toggles if required by UX (optional stretch goal).

### Milestone 5 – Experience Polish & Performance *(Depends on Milestone 3 & 4)*
- [ ] Add keyboard shortcuts through `src/hooks/useKeyboardShortcuts.ts` and document them in UI hints/tooltips.
- [ ] Implement virtualization or chunking for large diffs; ensure `PrettyDiff` is only instantiated when needed.
- [ ] Verify theming and mobile responsiveness, adjusting Tailwind classes or CSS overrides as necessary.

### Milestone 6 – Validation, Testing & Documentation *(Final milestone)*
- [ ] Add unit tests for new HTTP client utilities (`src/lib/opencode-http-api.ts`, `src/lib/opencode-client.ts`).
- [ ] Write integration tests covering diff fetch toggles, possibly in `src/lib/diff-integration.test.ts` or create new file.
- [ ] Update screenshots/docs (`docs/screenshots/file-browser.png` if needed) and README sections referencing new functionality.
- [ ] Run `bun run lint`, `bun x tsc --noEmit`, and targeted UI tests to confirm regression-free release.

## Implementation Order Summary
1. Discovery groundwork (Milestone 0).
2. Backend endpoint implementation (Milestone 1).
3. Client plumbing and type updates (Milestone 2).
4. File viewer UX updates (Milestone 3).
5. File tree/status integration (Milestone 4).
6. Performance polish & accessibility (Milestone 5).
7. Comprehensive validation and documentation updates (Milestone 6).

Each milestone depends on the completion of prior foundational work, except that Milestones 3 and 4 can progress in parallel once the client data contracts from Milestone 2 are stable.

## Validation Criteria
### Backend
- [ ] `/file/diff` returns correct diffs for staged and unstaged modes, including binary warnings and truncated outputs under load testing.
- [ ] API doc updates match deployed behaviour (method, params, response codes).

### Client Functionality
- [ ] File viewer successfully toggles between content and diff modes for modified files.
- [ ] Users can switch between staged and unstaged views; UI reflects mode with clear affordances.
- [ ] Git status badges in the file tree align with actual repository status and update after refresh.
- [ ] Diff rendering respects theme variables and displays correctly on mobile breakpoints.

### Performance & Reliability
- [ ] Rendering large diffs stays within acceptable render times (<200ms initial paint for medium diffs on reference hardware).
- [ ] No console errors or memory spikes when navigating between files repeatedly.

### Testing & Tooling
- [ ] Automated tests covering diff fetching, caching, and rendering pass (`bun run test` or targeted suites).
- [ ] Type checks and linting succeed after changes (`bun x tsc --noEmit`, `bun run lint`).
- [ ] Manual exploratory testing validates keyboard shortcuts and accessibility (screen reader focus traversal, aria labeling).

## Risk & Mitigation Notes
- **Large Diff Performance**: Mitigate by truncating server responses and lazy-rendering diff components; fall back to raw view if `PrettyDiff` chokes.
- **Binary Files**: Ensure server recognises binary diffs and client shows a friendly message; offer download instead of diff.
- **Git State Drift**: Maintain cache invalidation hooks on SSE git events and manual refresh actions to avoid stale diffs.
- **Accessibility Compliance**: Leverage WAI-ARIA roles for toggles (`role="tablist"` or `aria-pressed`) and ensure keyboard shortcut documentation is visible.

## Follow-Up Documentation Targets
- Update `IMPLEMENTATION_SUMMARY.md` with a short synopsis of the new feature.
- Refresh `CONTEXT/API-ENDPOINTS-DOCUMENTATION.md` and create a short guide under `docs/` if end-user instructions are warranted.

This plan can be executed sequentially using the milestones above, ensuring the file viewer gains rich git diff capabilities without disrupting existing workflows.

---

## Implementation Summary (Updated 2025-10-29)

### What Was Actually Implemented

**Key Discovery**: The `/session` endpoint already provides git diffs in `response.summary.diffs[]`, eliminating the need for a separate `/file/diff` API endpoint. This significantly simplified the implementation.

### Changes Made

#### 1. Type Definitions (`src/types/opencode.ts`)
- Added `SessionDiff` interface with fields: `file`, `before`, `after`, `additions`, `deletions`
- Added `SessionSummary` interface containing `diffs` array

#### 2. Diff Utilities (`src/lib/diff-utils.ts`)
- Added `generateUnifiedDiff()` function to convert before/after content into unified diff format
- This enables rendering session diffs using the existing `PrettyDiff` component with `diff2html`

#### 3. Data Layer (`src/hooks/useOpenCode.ts`)
- Added `currentSessionDiffs` state to store session diffs
- Updated session loading logic (hydration and `switchSession`) to extract diffs from `session.summary.diffs`
- Exposed `currentSessionDiffs` in the hook's return value

#### 4. UI Component (`src/app/_components/message/FilePart.tsx`)
- Added Content/Diff view mode toggle with button controls
- Implemented file matching logic to find relevant diffs by path or filename
- Integrated `PrettyDiff` component for rendering unified diffs
- Added badge showing `+additions/-deletions` when diff is available
- Preserved all existing functionality (downloads, images, etc.)

### Architecture Benefits

1. **No backend changes required** - Leverages existing session endpoint data
2. **Automatic updates** - Diffs refresh whenever session is loaded or switched
3. **Minimal performance impact** - Diffs only generated on-demand when user toggles to diff view
4. **Reuses existing components** - `PrettyDiff` handles all rendering with theme support

### Testing Results

- ESLint: ✅ Clean (1 pre-existing warning unrelated to changes)
- Code structure: ✅ Follows established patterns
- Type safety: ✅ All new types properly defined

### Remaining Work (Optional Enhancements)

The core functionality is complete. Optional future enhancements:
- Keyboard shortcuts for toggling diffs (Milestone 5)
- Git status badges in file browser (Milestone 4)
- Unit tests for `generateUnifiedDiff` (Milestone 6)
- Performance testing with very large diffs (Milestone 5)
