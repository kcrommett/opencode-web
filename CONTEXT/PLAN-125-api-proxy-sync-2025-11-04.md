## Context & Decisions
- **Source:** GitHub issue [#125](https://github.com/kcrommett/opencode-web/issues/125) requires our API proxy layer to match the latest OpenCode API (documented in `docs/CONFIGURATION.md`) so web clients can access todo lists, forks, diffs, status endpoints, TUI controls, logging, and streaming features missing today.
- **Current gap:** `src/lib/opencode-http-api.ts` and `src/lib/opencode-server-fns.ts` only proxy a subset of endpoints and omit several parameters (`directory`, `dirs`, `noReply`, `tools`, `partID`, etc.), causing UI features (todos, directory-aware searches, diff viewers, permission handling) to rely on placeholders or SSE-only data.
- **Design direction:** Keep all outbound HTTP logic centralized in `opencode-http-api.ts`, expose them via TanStack server functions, and surface higher-level helpers in `src/lib/opencode-client.ts` + `src/hooks/useOpenCode.ts`. Reuse Bun tooling (`bun run lint`, `bun x tsc --noEmit`, `bun run test`) per AGENTS.md.
- **SSE consideration:** `/api/events` already proxies `GET /event`; we must confirm URL builder + server route handle directory scoping so new todo/diff/status data stay live-updated.

## Issue 125 Traceability
- [ ] Add missing endpoints (todo, fork, diff, status, TUI, log, event) in both HTTP + server-fn layers.
- [ ] Implement missing parameter support (directory scoping, dirs flag, message/tool metadata) across send/run/revert/find APIs.
- [ ] Finish `getFileDiff()` by calling `/session/{id}/diff` and return structured data consumed by UI.
- [ ] Update `respondToPermission()` to accept `once|always|reject` and propagate types end-to-end.
- [ ] Extend client/UI types so todos, forks, diffs, and status data are visible and testable.
- [ ] Validate against live OpenCode server plus existing Bun lint/type/test suites.

## Internal References
- `docs/CONFIGURATION.md` – canonical spec for endpoints/params (see sections 9.05, 10.31, 13.27-13.68, 14.41-17.30).
- `src/lib/opencode-http-api.ts` – browser-side fetch wrappers needing new endpoints + parameter handling (lines ~1-782 for current coverage, placeholder `getFileDiff`).
- `src/lib/opencode-server-fns.ts` – TanStack server functions mirroring HTTP API (lines ~1-375).
- `src/lib/opencode-client.ts` – frontend service facade consuming server fns (e.g., `sendMessage`, `runCommand`, SSE helpers, logging stub).
- `src/hooks/useOpenCode.ts` – primary state manager & UI integration surface (todos, permissions, command palette, SSE updates around lines 1800-2350).
- `src/app/index.tsx` & `_components/ui/*` – UI consumers that show todos, diffs, status panels (e.g., `lsp-status-panel.tsx`, `modified-files-panel.tsx`).
- `packages/opencode-web/server.ts` & `/api/events` route (if adjustments needed for new upstream endpoints).

## External References
- GitHub issue: https://github.com/kcrommett/opencode-web/issues/125
- OpenCode API spec (latest main): https://github.com/kcrommett/opencode-web/blob/main/docs/CONFIGURATION.md

## Technical Specifications
### Endpoint Gap Matrix
| Category | Endpoint (Method/Path) | Proxy Touchpoints | Notes |
| --- | --- | --- | --- |
| Session Todo | `GET /session/{id}/todo` | `opencode-http-api.ts`, `opencode-server-fns.ts`, `opencode-client.ts`, `useOpenCode.ts`, `OpenCodeContext.tsx`, `src/app/index.tsx` | Fetch initial todos (SSE updates already exist); needs type-safe data + refresh controls. |
| Session Fork | `POST /session/{id}/fork` | Same as above + UI entry points (session list, toolbar) | Returns new session; ensure `directory` query + `messageID` body optional. |
| Session Diff | `GET /session/{id}/diff` | HTTP/server functions + new `getFileDiff` helper & diff-related UI (`_components/message/DiffPart.tsx`) | Supports optional `messageID`. |
| File Search | `GET /find` | HTTP/server functions + `openCodeService.searchText` | Add `directory` query passthrough. |
| File Lookup | `GET /find/file` | `findFiles` wrappers | Support `dirs=true|false`. |
| Symbol Search | `GET /find/symbol` | `findSymbols` wrappers | Add optional `directory`. |
| LSP Status | `GET /lsp` | HTTP/server + `openCodeService` + `lsp-status-panel.tsx` | Provide structured diagnostics summary fallback outside SSE. |
| Formatter Status | `GET /formatter` | same | Expose to UI (maybe `sidebarStatus`). |
| TUI Commands | `POST /tui/open-help`, `/open-sessions`, `/open-themes`, `/open-models` | HTTP/server + `openCodeService` + UI triggers | Mirror pattern used for `append/submit/clear/execute`. |
| TUI Events | `POST /tui/publish` | same | Accept generic payload. |
| TUI Control Loop | `GET /tui/control/next`, `POST /tui/control/response` | HTTP/server + service hooks | Provide queue to build TUI automation tools. |
| Logging | `POST /log` | HTTP/server + replace `openCodeService.log` stub | Accept `{service, level, message, extra}`. |
| SSE Events | `GET /event` | Confirm `getEventStreamUrl` + `server.ts` proxies | Ensure query encodes `directory` consistently. |

### Parameter & Behavior Enhancements
- **Directory scoping:** propagate optional `directory` query through `findInFiles`, `findSymbols`, `sendMessage`, `runCommand`, `revertMessage`, `getSessionChildren`, etc., so multi-project worktrees behave correctly.
- **File search flag:** support `dirs` boolean in `findFiles` to include directories (map to `true/false` string).
- **`sendMessage` body:** accept optional `noReply`, `system` prompt overrides, `tools` object, `messageID` override; adjust `Part` serialization to avoid double text pushes.
- **`runCommand`:** in addition to `args: string[]`, support spec-compliant `arguments` (structured) while keeping backward compatibility.
- **`revertMessage`:** include optional `partID` per spec.
- **`respondToPermission`:** send string enum `"once" | "always" | "reject"` instead of boolean; update UI state accordingly.
- **`getFileDiff`:** call `/session/{id}/diff` (optionally filtered by messageID) and return typed file diff data; gracefully fallback when API lacks info.

### Data Models & Validation Contracts
- Extend `src/types/opencode.ts` with:
  - `FileDiff` / `SessionDiffResponse` types for `/session/{id}/diff`.
  - `SessionForkRequest`/`Response`, `Todo` alias (already defined), `PermissionResponse` enum, `TuiEvent`, `TuiControlRequest/Response`, `LspStatus`, `FormatterStatus`.
- Update TanStack server fn validators to enforce required fields (e.g., `messageID` in fork, `response` enum in permissions).
- Ensure `useOpenCode` state slices (todos, sidebar status) use new types to avoid `any`.

### Integration Points
- **Service Layer:** `src/lib/opencode-client.ts` should add helper methods for each new endpoint plus new options on existing methods.
- **Context/Hook:** `src/hooks/useOpenCode.ts` + `src/contexts/OpenCodeContext.tsx` expose new helpers/state (todo fetch, session fork UI, diff fetch, status refresh, permission responses).
- **UI:** update `src/app/index.tsx` (session sidebar, todo panel), `src/app/_components/message/DiffPart.tsx`, `src/app/_components/ui/lsp-status-panel.tsx`, `src/app/_components/ui/mcp-status-panel.tsx`, `src/app/_components/ui/permission-modal.tsx`, etc., to consume new data.
- **Server route:** verify `src/server.ts` (and any `packages/opencode-web/*/server.ts`) proxies `api/events`, `api/log`, and other new paths to upstream `getOpencodeServerUrl()` host.

## Implementation Plan & Order
_Execute milestones sequentially; each depends on outputs from the prior step._

### Milestone 1 – Spec audit & scaffolding (dependency for all others)
- [ ] Reconcile `docs/CONFIGURATION.md` with latest upstream (confirm endpoints + params) and note any discrepancies.
- [ ] Document consolidated TypeScript interfaces/enums for new responses/requests in `src/types/opencode.ts` (include diff/todo/permission/tui/lsp data).
- [ ] Confirm server routing (e.g., `/api/events`, `/api/log`) can reach upstream host; add TODOs if additional express handlers are required in `src/server.ts`.

#### Milestone 1 Notes (2025-11-04)
- All endpoints called out in the gap matrix are documented in `docs/CONFIGURATION.md` between sections 13–17; parameters `directory`, `dirs`, `messageID`, `noReply`, `tools`, `arguments`, and `partID` are explicitly supported and require passthrough only.
- `respondToPermission` expects `{ "response": "once|always|reject" }`; this confirms the enum change and no additional fields are necessary.
- TUI endpoints (`open-*`, `publish`, `control/next`, `control/response`) return simple boolean/TUI request payloads—no schema drift observed, so we can implement thin proxies without extra guards.
- Logging endpoint `/log` absorbs `{service, level, message, extra}` from spec; ensure `level` sticks to `debug|info|error|warn` as strings.
- Both Bun server entrypoints already proxy `/api/events` to upstream `/event` while preserving the `directory` query param, so new endpoints can continue to go through the standard server-fn fetch layer without extra routing.

### Milestone 2 – HTTP + server-fn parity
- [ ] Add missing fetchers in `src/lib/opencode-http-api.ts` for every endpoint listed in the gap matrix, ensuring `buildUrl` is reused (consider helper for repeated POST boilerplate).
- [ ] Extend existing fetchers with new params (`directory`, `dirs`, `messageID`, `noReply`, `tools`, `arguments`, `partID`, `response` enum) and normalize error handling for clarity.
- [ ] Mirror each addition in `src/lib/opencode-server-fns.ts` with appropriate `createServerFn` definitions + validators; keep signatures consistent with HTTP layer.
- [ ] Update `getFileDiff()` to call `/session/{id}/diff`, parse response into typed diff model, and surface null-safe fallbacks.

### Milestone 3 – Client service & state plumbing
- [ ] Update `src/lib/opencode-client.ts` to expose new helper methods (e.g., `getSessionTodos`, `forkSession`, `getSessionDiff`, `getLspStatus`, `logEvent`, `openTui*`, `tuiControlNext/Respond`) and to pass new options for `sendMessage`, `runCommand`, `respondToPermission`.
- [ ] Thread new helpers through `src/contexts/OpenCodeContext.tsx` so components/hooks can consume them without reaching into server-fns directly.
- [ ] Refactor `openCodeService.log` to use the new `/log` endpoint while preserving dev console output gating.
- [ ] Ensure SSE utilities continue to source `/api/events` URL, but provide manual refresh pathways for todos/status in case SSE misses updates.

### Milestone 4 – UI feature enablement
- [ ] Update `src/hooks/useOpenCode.ts` to: fetch todos on session switch, expose new `forkSession`, `getSessionDiff`, `refreshStatus` helpers, honor `PermissionResponse` enum, and wire directory-aware search parameters.
- [ ] Refresh UI components (`src/app/index.tsx`, `_components/message/DiffPart.tsx`, `_components/ui/lsp-status-panel.tsx`, `_components/ui/mcp-status-panel.tsx`, `_components/ui/permission-modal.tsx`, `_components/ui/modified-files-panel.tsx`) to consume new state fields and provide user controls (e.g., "Fork session", "View diff" buttons, directory filters for find commands).
- [ ] Add any necessary form inputs/toggles in message composer or command palette for `noReply`, `system`, `tools`, and `runCommand` arguments (if UX-ready); otherwise, ensure backend accepts them via optional config object for future expansion.
- [ ] Verify todo badges (`src/app/index.tsx:4454+`) correctly show counts pulled from new API response even before SSE pushes updates.

### Milestone 5 – Validation, documentation, and polish
- [ ] Create regression/unit tests where possible (e.g., `src/lib/commandParser.test.ts`, new tests for diff parsing) to cover new behaviors.
- [ ] Update developer docs (`docs/CONFIGURATION.md` if local tweaks, `docs/SSE-*.md`, `README.md` usage notes) to mention new capabilities and required configuration (logging, TUI control endpoints, etc.).
- [ ] Run quality gates and manual verification (see Validation Criteria) before opening PR; capture screenshots if UI changed.

## Validation Criteria
- Automated checks:
  - [ ] `bun x tsc --noEmit`
  - [ ] `bun run lint`
  - [ ] `bun run test` (or targeted suites touching any new helpers)
```bash
bun x tsc --noEmit
bun run lint
bun run test
```
- Manual/API tests (against a live OpenCode server):
  - [ ] Use `curl` or Postman to hit each newly proxied endpoint via local dev server (`GET http://localhost:4173/api/session/<id>/todo`, etc.) and confirm 200 responses.
  - [ ] Verify `runCommand` with structured `arguments`, `sendMessage` with `noReply/tools/system`, and `respondToPermission` with each enum value.
  - [ ] Trigger TUI actions from the UI and confirm server responses/log entries.
  - [ ] Confirm SSE stream still connects after directory parameter changes by watching devtools logs.
- UI smoke tests:
  - [ ] Session list shows forked sessions immediately.
  - [ ] Todo count panel populates on initial load.
  - [ ] Diff viewer renders actual file diffs from new API.
  - [ ] LSP/formatter panels show statuses or gracefully fall back.

## Risks & Open Questions
- **Spec drift:** CONFIGURATION.md might lag behind the upstream server; document any discrepancies and guard new fetchers with feature flags if necessary.
- **Permission UX:** Switching from boolean to enum responses may require UI messaging updates; confirm expected flows with design/product before shipping.
- **Tool invocation schema:** `sendMessage.tools` structure may require additional type safety (e.g., union of booleans vs config objects); validate with backend before finalizing types.
- **TUI event payloads:** Without concrete schema, we may need generic `Record<string, unknown>` typing; ensure runtime validation prevents malformed events from crashing the UI.
- **Testing coverage:** Some endpoints (e.g., SSE, TUI control) need live server interaction; plan for manual verification or mock harnesses if automated coverage is infeasible.
