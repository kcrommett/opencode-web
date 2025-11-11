# Configuration Saving Alignment Plan

## Background
- The new `PATCH /config` endpoint (see `CONFIG_API_UPDATES.md`) now accepts an explicit `scope=global|project` query parameter, defaults to project scope, writes to `opencode.jsonc` (with JSONC support) and performs permission checks, validation, backup/rollback, and more descriptive error responses.
- After persisting the merged configuration the server fires `Config.Event.Updated` with `scope`, `directory`, `before`, `after`, and a rich `diff` payload (`config.md`). Consumers must invalidate caches selectively based on `diff` and avoid disposing broad instances.
- Our current settings screens and helpers assume a single config scope, patch `/config` without scope awareness, and do not react to the new SSE event payload, so we need a plan that ties everything together.

## Objectives
1. Ensure every config save request explicitly states the target scope and only supplies `directory` when writing project scope.
2. Surface the new scope options and `opencode.jsonc` targets inside the Settings page and config modal (path display, scope guards, save indicator, error feedback).
3. React to `Config.Event.Updated` so UI caches stay fresh without manual refresh and debug info (diff logging) stays accessible.
4. Gracefully show the new error kinds (permission, validation, write errors) so users understand why a save failed.
5. Cover the new flow with targeted tests or manual verification steps and document any instructions for downstream teams.

## Task Breakdown

### 1. API client + hook adjustments
- `openCodeService.updateConfig` (src/lib/opencode-client.ts) must always forward the selected `scope` string and only include `directory` for project writes; global saves should never send a directory so the server can target `~/.config/opencode/opencode.jsonc`.
- `src/lib/opencode-server-fns.ts` should continue to pass the new `scope` into `httpApi.updateConfig`, but double-check that the fallback logic (local file update) uses the right `opencode.jsonc` path per the new `updateConfigFileLocal` contract.
- `useConfigUpdate` (`src/hooks/useConfigUpdate.ts`) needs to derive the scope before each save, apply the explicit scope option from the UI, and guard against sending the current project directory for global saves. Validate that optimistic reloads and error handling still make sense when scope flips.
- Document the expectation: calling code should pass `{ scope: "global" }` or `{ scope: "project" }` depending on the UI selection rather than relying on inferred defaults.

### 2. Settings UI + modal changes
- `ConfigurationPage` (`src/app/settings/-components/ConfigurationPage.tsx`) and `ConfigurationModal` (`src/app/_components/ui/config-modal.tsx`) must expose the scope dropdown, show the resolved target file (`~/.config/opencode/opencode.jsonc` vs `${worktree}/opencode.jsonc`), and disable project-saving controls when no worktree is selected.
- Ensure the "Save Changes" flow batches the right fields under the selected scope so a mixed set of updates (e.g., theme + MCP) do not mix scopes, and the scope toggle clears unsaved state to avoid cross-scope leakage.
- When showing the JSON view, annotate it with the current scope and fallback to the global cache when the project config is unavailable, matching the new API's search order.
- Extend the config modal's `handleSave` to log the new `diff` fields for debugging (per `config.md`), and show friendly error toasts when a `ConfigValidationError` or `ConfigUpdateError` arrives.

### 3. SSE event handling & cache invalidation
- Extend `src/lib/opencode-events.ts`’s `OpencodeEvent` union with a `ConfigUpdatedEvent` that matches the `Config.Event.Updated` payload (including `scope`, optional `directory`, and the `diff` shape from `config.md`).
- Update `useOpenCode`’s SSE handler (around the `handleSSEEvent` switch) to listen for the new config event. When it arrives, call `loadConfig({ force: true })` if the event pertains to the currently selected directory or the global scope, and keep a concise log of `diff` for observability.
- Use the `config.md` advice: don’t indiscriminately dispose everything; instead, invalidate the specific cached config state (global/project) based on the event’s `scope` and `directory`, so `OpenCodeContext` always serves fresh data without a manual refresh.
- Ensure the `loadConfig` cache key (`lastConfigDirectoryRef`) is reset appropriately when a global update arrives so the next fetch reuses the updated global config even if the project directory hasn’t changed.

### 4. Error handling / user feedback
- Parse the richer error responses from `httpApi.updateConfig` (permission/validation/write errors) inside `openCodeService` or the consuming hooks and convert them into structured messages the modal/settings UI can surface via toasts or inline helpers.
- When `ConfigValidationError` arrives, show the `path` and offending `message` so users can fix their edits before retrying. For permission failures, point them to the directory that lacks write access (global config dir or project root).
- Consider a fallback UI message when the server returns backup/rollback info.

### 5. Tests & documentation
- Add or update unit/integration tests (or manual QA steps) for `ConfigurationPage`/`ConfigModal` to cover both scopes, scope switching, and SSE-triggered reloads.
- Update relevant docs (`docs/CONFIGURATION.md`, `CONFIG_API_UPDATES.md` summary) so the new UI behavior is recorded.
- Mention the new plan and event behavior in any release notes so other clients know to update their config-saving logic similarly.

## Next Steps
1. Agree on the scope display and error UX, then start updating the hook/service layer.
2. Wire up SSE event handling and ensure `loadConfig` invalidation works without duplicates.
3. Finish UI polish (scope hints, save indicator) and finalize documentation/tests before merging.
