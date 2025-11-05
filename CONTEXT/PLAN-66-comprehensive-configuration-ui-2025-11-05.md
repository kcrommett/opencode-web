## Overview & Context
The OpenCode web frontend currently exposes only theme switching, even though the backend already supports full configuration management through `GET /config`, `PATCH /config`, and `Config.update()`.
GitHub issue #66 requests a comprehensive configuration UI so users can manage MCP servers, agents, providers, commands, permissions, experimental flags, and import/export workflows without manually editing files. On 2025-11-05, we aligned in this conversation to create a full project plan that captures decisions, technical approaches, and validation criteria to execute the issue end-to-end.

### Issue Reference
- [#66 · Add comprehensive configuration management UI for dynamic OpenCode config updates](https://github.com/kcrommett/opencode-web/issues/66)

### Decisions & Rationale Captured
- Build a dedicated settings/configuration surface rather than bolting features onto the crowded home screen.
- Reuse existing server functions and HTTP APIs (`src/lib/opencode-server-fns.ts`, `src/lib/opencode-http-api.ts`) instead of inventing new endpoints whenever possible.
- Lean on OpenCode SDK schemas (Zod types referenced in the upstream repo) for real-time validation to prevent invalid config states.
- Implement the roadmap in three acceptance phases (core, advanced, enhanced UX) while adding a foundational phase for schema alignment and a wrap-up phase for QA/rollout.

## Goals & Constraints
- Match the acceptance criteria from issue #66 across Phase 1 (core config UI), Phase 2 (advanced features), and Phase 3 (enhanced UX safeguards).
- Preserve backward compatibility with existing config files and CLI tooling described in `docs/CONFIGURATION.md`.
- Support multi-project directories (directory-aware APIs already exist) and avoid breaking SSR/TanStack Start conventions.
- Prefer Bun-native tooling for builds/tests (`bun run build`, `bun run lint`, `bun x tsc --noEmit`, `bun run test`).
- Ensure sensitive provider credentials never leak to the client logs; rely on masked inputs and dev-only logs guarded by `process.env.NODE_ENV !== "production"`.

## Current State Assessment
### Config Data Flow (Backend)
- `src/lib/opencode-server-fns.ts:18-520` already defines `createServerFn` wrappers for `getConfig` (line 268) and `updateConfig` (lines 440-446).
- `src/lib/opencode-http-api.ts:635-974` performs the actual `GET /config` and `PATCH /config` fetches, including headers and error handling.
- `src/lib/opencode-client.ts:845-854` exposes `openCodeService.updateConfig` which simply forwards to the server function.

### Client & Hooks
- `src/hooks/useOpenCode.ts:3455-3471` loads and caches config data, exposing `config`, `configLoading`, and `loadConfig` through `OpenCodeContext`.
- `src/hooks/useConfigUpdate.ts:5-46` offers helper methods `updateConfigField` and `updateAgentModel`, currently used only for theme switching.
- `src/lib/config.ts` provides helpers to resolve agent/default models and feature flags from the config object.

### UI Touchpoints
- `src/app/index.tsx` contains the current theme picker dialog (#81 onwards) but no unified settings route.
- `src/app/_components/ui` already holds reusable primitives (buttons, dialog, checkbox, etc.) that the new settings experience should reuse.
- `src/contexts/OpenCodeContext.tsx` makes all config data available to nested components, so the new page can consume it without new providers.

### Documentation & Schema Assets
- `docs/CONFIGURATION.md` enumerates configuration options (theme, agents, commands, permissions, experimental hooks, etc.) and will serve as the authoritative source for field descriptions.
- Upstream references for schema & API behavior:
  - Config structure: https://github.com/sst/opencode/blob/dev/packages/opencode/src/config/config.ts
  - Config update API: https://github.com/sst/opencode/blob/dev/packages/opencode/src/server/server.ts#L161
  - Generated SDK types (Zod schema): https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts#L308

## Technical Specifications
### Config Sections & UI Mapping
| Section | Example Fields | Proposed UI Module | Backend/Endpoint |
| --- | --- | --- | --- |
| Theme | `theme` | Theme selector card (integrated preview) on the settings page | `GET /config`, `PATCH /config` via `updateConfigField("theme", value)` |
| Default Model | `model`, `small_model` | Provider/model dropdown with quick links to provider auth | `GET /providers`, `GET /commands`, `PATCH /config` |
| Agents | `{ agent: Record<string, AgentConfig> }` | Agent list + editor (name, model, prompt, permissions) | `GET /agents`, `PATCH /config.agent[name]` |
| Providers | `{ provider: Record<string, ProviderConfig> }` + creds | Provider list with API key/base URL inputs + `setAuth` call | `GET /providers`, `POST /auth/{provider}` |
| MCP Servers | `{ mcp: Record<string, McpConfig> }` | Table to add/edit local & remote servers, command arrays, env key-values | `PATCH /config.mcp`, `GET /mcp` for status |
| Commands | `{ command: Record<string, CommandConfig> }` | Command editor with preview and trigger shortcuts | `GET /command`, `PATCH /config.command` |
| Keybinds/Permissions | `keybinds`, `permission`, `tools` | Keyboard shortcut manager + permission matrix | `PATCH /config.keybinds`, `PATCH /config.permission` |
| Experimental | `experimental` block | Feature toggle switches with detail tooltips | `PATCH /config.experimental` |
| Import/Export | entire config object | Upload/download JSONC; optionally use `POST /config/backup` once added | new server handlers described below |

### API Contracts
```http
GET /config
Accept: application/json
Response: OpencodeConfig

PATCH /config
Content-Type: application/json
Body: Partial<OpencodeConfig>
Response: Updated OpencodeConfig
```
```http
PUT /auth/{providerId}
Body: { "type": string; "key": string }
Response: ProviderAuthStatus
```
```http
GET /mcp
Response: McpStatusResponse (connection states per server)
```
New endpoints to add during Phase 2/3:
```http
POST /config/backup
Body: { directory?: string }
Response: { path: string; createdAt: string }

POST /config/restore
Body: { snapshotId: string } | { content: string }
Response: OpencodeConfig
```

### Data Modeling & Validation
- `src/types/opencode.ts:153-165` currently models `OpencodeConfig` loosely; we need extended interfaces for `permission`, `experimental`, `mcp`, etc., plus derived types for UI forms.
- Leverage upstream Zod schemas (`packages/sdk/js/src/gen/types.gen.ts`) to validate on the client before PATCHing; wrap them inside a local module (e.g., `src/lib/opencode-config-schema.ts`).
- Represent MCP server command arrays as tuples `[command, ...args]` and environment maps of `Record<string, string>`.
- Permissions & experimental toggles should resolve to enumerations to keep the UI deterministic.

### Integration Points & Events
- Config changes should optimistically update UI state via `useConfigUpdate`, with rollback when server rejects.
- SSE/event stream (`src/lib/opencode-server-fns.ts#getEventStreamUrl`) can later broadcast config change events; plan to append events to `src/lib/opencode-events.ts`.
- Import/export flows must respect workspace directory scoping (pass `directory` from `useOpenCode.currentProject`).

## Proposed Architecture & Implementation Strategy
### Backend Enhancements
- Extend `src/lib/opencode-server-fns.ts` and `src/lib/opencode-http-api.ts` to expose backup/restore/history endpoints once backend ships them (interim: stub with warnings).
- Add config validation helpers to `src/lib/opencode-config.ts` to coerce provider + agent models, merge partial updates, and prepare payloads for `updateConfig`.
- Optionally introduce a streaming endpoint for config diffs to drive history/undo.

### Frontend State & Hooks
- Expand `useConfigUpdate` with granular helpers (`updateAgent`, `updateProvider`, `upsertMcpServer`, etc.) plus optimistic cache updates.
- Introduce a dedicated TanStack Store/Context slice (or extend `useOpenCode`) to hold editing drafts, validation errors, and dirty flags.
- Use Suspense-friendly loaders in the new settings route to fetch config, agents, providers, commands, MCP status, and provider metadata in parallel.

### UI Modules
- Create `src/app/settings/configuration.tsx` (route) and `src/app/_components/config/*` for reusable sections (cards, tables, forms).
- Provide search/filter across config entries, breadcrumbs for nested resources (agents > agent-name), and inline docs referencing `docs/CONFIGURATION.md`.
- Use existing UI primitives (dialog, bottom sheet, form components) to maintain visual consistency.

### Validation & Error Handling
- Provide inline validation states (error labels, disabled submit) powered by Zod.
- Add toast notifications via `openCodeService.showToast` (`src/lib/opencode-server-fns.ts:340-350`) for success/failure.
- Log dev-only diagnostics with guard clauses to avoid leaking secrets.

## Actionable Task Breakdown
### Phase 0 — Foundations & Schema Alignment
- [ ] Audit `docs/CONFIGURATION.md` against upstream config schema and extend `src/types/opencode.ts` with typed subsections (agents, permissions, experimental, MCP, commands, keybinds).
- [ ] Add `src/lib/opencode-config-schema.ts` with Zod schemas generated or imported from upstream SDK, plus helper functions for parsing/serializing partial updates.
- [ ] Enhance `src/lib/opencode-config.ts` with utilities for merging partial updates, formatting MCP command arrays, and mapping permission enums for UI consumption.
- [ ] Extend `useConfigUpdate` to accept typed payloads (generics) and expose optimistic update callbacks; update all existing call sites to the new signature.
- [ ] Add Storybook-like fixtures (or test JSON) under `docs/config-samples/` (if allowed) to exercise various config combinations for dev preview.

### Phase 1 — Core Configuration Surface (Issue Phase 1)
- [ ] Create a new TanStack route (`src/app/settings/configuration.tsx`) with loader fetching config, agents, providers, commands, MCP status, and provider metadata in parallel.
- [ ] Build a settings navigation shell (sidebar tabs + responsive bottom sheet) using components in `src/app/_components/ui` and wire it into the global nav (button in `src/app/index.tsx`).
- [ ] Implement theme selector with live preview by reusing logic from the existing dialog, but move state into the settings page and sync via `useConfigUpdate`.
- [ ] Add default model/provider section: combine `useOpenCode.models`, provider capability metadata, and `updateConfigField("model", value)` to allow provider/model selection and fallback to `selectModel` for active session.
- [ ] Implement CRUD UI for agents: list from `GET /agents`, allow create/edit/delete, edit prompts/permissions/tools, and patch the `config.agent` map.
- [ ] Build provider configuration forms (API keys, base URLs, auth status) using masked inputs and `openCodeService.setAuth`; surface provider errors inline.
- [ ] Include provider + agent validations (e.g., ensure referenced provider/model pairs exist) before enabling "Save".

### Phase 2 — Advanced Configuration Modules (Issue Phase 2)
- [ ] Add MCP management table supporting add/remove/edit for local (`command`, `environment`) and remote (`url`, `headers`) servers; integrate status badges from `getMcpStatus`.
- [ ] Implement a command editor for `config.command` with Markdown prompt editing, trigger shortcuts, and agent/model targeting.
- [ ] Create permission management UI covering global permission defaults, per-agent overrides, and tool toggles; enforce enum selections only.
- [ ] Add experimental feature toggles referencing `config.experimental`, with tooltips linking to docs and guard rails for unstable flags.
- [ ] Implement config import/export: allow downloading current config as JSONC, uploading replacement (with dry-run validation), and surfacing diff preview before applying.

### Phase 3 — Enhanced UX Safeguards (Issue Phase 3)
- [ ] Add real-time validation overlays powered by Zod; highlight offending fields and block submission while invalid.
- [ ] Provide "Reset to defaults" actions per section, using baseline templates from `docs/CONFIGURATION.md` or upstream defaults, with confirmation dialogs.
- [ ] Implement config history/undo by storing snapshots locally (browser IndexedDB) and wiring to future `/config/backup` endpoints once available.
- [ ] Add search/filter across the entire settings page (by key, value, section) for large configs.

### Phase 4 — Integration, Testing, and Rollout
- [ ] Add unit tests for helpers (`src/lib/opencode-config.ts`, new schema module) using `bun run test` and existing Vitest setup; cover merge/validation logic.
- [ ] Add component-level tests (Playwright or React Testing Library) for critical forms (theme selector, agent editor, MCP table) to ensure validation flows.
- [ ] Update documentation (`docs/CONFIGURATION.md`, new `docs/screenshots/*`) with screenshots of the new UI and usage instructions.
- [ ] Run `bun run lint`, `bun x tsc --noEmit`, and `bun run build` before merging; capture any regressions introduced in shared components.
- [ ] Prepare release notes summarizing added UI and any new backend endpoints for API compatibility tracking (per AGENTS.md guidance).

## Implementation Order & Milestones
1. **Schema Foundation (Phase 0)** — blocks all downstream UI because we need typed config sections + validation.
2. **Core Surface (Phase 1)** — deliver minimal viable settings page with theme, model, agent, and provider control to satisfy Phase 1 acceptance.
3. **Advanced Modules (Phase 2)** — layer MCP, command, permission, and experimental management after base UI exists.
4. **UX Enhancements (Phase 3)** — add validation, history, search once editing flows are stable.
5. **Hardening & Rollout (Phase 4)** — finalize tests, docs, and release artifacts; re-run regression checks before shipping.
Each milestone depends on the previous because later phases reuse state management, components, and validation primitives built earlier.

## Validation Criteria
### API & Backend
- `bun run test` covers config helpers, ensuring merge/validation logic handles at least: agent CRUD, provider auth, MCP commands, and experimental toggles.
- Manual/API tests: `curl -X PATCH http://localhost:3000/config -d '{"theme":"dracula"}'` round-trips change and surfaces in UI.
- Backup/restore endpoints (once added) must return deterministic timestamps and reject invalid payloads with actionable error messages.

### Frontend UI
- Theme selector updates preview instantly and persists after page reload.
- Agent CRUD: creating, editing, and deleting agents reflects in the config object and subsequent sessions without page reloads.
- Provider forms mask secrets, show connection status, and handle partial updates without clearing untouched fields.
- MCP table displays live status badges and prevents duplicate server names.
- Import/export validates JSONC structure before invoking PATCH, showing diff preview for user confirmation.

### Enhanced UX
- Real-time validation blocks submission when required fields missing and explains the issue inline.
- Reset-to-default restores known good templates; undo/redo replays recent snapshots without losing manual edits.
- Global search returns matching keys/values across sections within 200ms for 500+ entries.

### Regression Guardrails
- Run `bun run lint`, `bun x tsc --noEmit`, and `bun run build` on every milestone branch.
- Verify mobile/tablet responsiveness via responsive viewports or Playwright scenarios before sign-off.

## Code References
### Internal Paths
- `src/lib/opencode-server-fns.ts:18-520` — server function wrappers including `getConfig`, `updateConfig`, `showToast`.
- `src/lib/opencode-http-api.ts:635-974` — HTTP layer for config, provider auth, MCP status.
- `src/lib/opencode-client.ts:821-890` — client SDK bridging UI and server fns (`openCodeService`).
- `src/hooks/useOpenCode.ts:3429-3580` — config loading, command loading, and model selection utilities.
- `src/hooks/useConfigUpdate.ts:5-46` — helper hook for PATCHing config fields.
- `src/lib/config.ts:1-88` — derived getters for themes, models, and feature flags.
- `src/app/index.tsx` — existing theme picker dialog and navigation entry points.
- `src/app/_components/ui/*` — buttons, dialog, forms reused by the new settings UX.
- `src/contexts/OpenCodeContext.tsx:1-147` — exposes config state to all components.
- `docs/CONFIGURATION.md` — reference manual for config options.

### External References
- Config schema source: https://github.com/sst/opencode/blob/dev/packages/opencode/src/config/config.ts
- Config update server implementation: https://github.com/sst/opencode/blob/dev/packages/opencode/src/server/server.ts#L161
- Generated SDK/Zod types: https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts#L308
- MCP Protocol specification: https://modelcontextprotocol.io/
- OpenCode configuration docs (public): https://opencode.ai/docs/config
- Agent configuration guide: https://opencode.ai/docs/agent

## Risks & Open Questions
- **Backend support for backup/history**: confirm whether new endpoints will land in time; otherwise, local snapshots must suffice.
- **Provider credential handling**: verify whether `PUT /auth/{provider}` can return masked secrets for confirmation without exposing plaintext.
- **Large config performance**: ensure virtualization or lazy rendering for lists (agents, commands, MCP servers) to avoid blocking the main thread.
- **Authorization**: clarify whether all users can edit config or if role-based access will be required in future (affects route guarding).

This plan captures the full context from issue #66 and our discussion, enumerates actionable tasks with sequencing, references the necessary files, and defines validation criteria so implementation can proceed without re-establishing context.