## Context Recap
### Conversation & Repo Constraints
- Working in `/home/shuv/repos/worktrees/opencode-web/61-enhance-shell-command-support`, targeting GitHub issue #61 on this branch; we must keep plan and follow-up work scoped to shell-command enhancements.
- User explicitly requested a comprehensive project plan saved under `CONTEXT/` (`PLAN-shell-command-enhancements-2025-11-03.md`) so future contributors can execute without revisiting this chat.
- Project guardrails from `AGENTS.md`: rely on Bun scripts (`bun install`, `bun run lint`, `bun x tsc --noEmit`, `bun run test`), adhere to TanStack Start patterns, minimize `any`/extraneous state, and gate logs behind non-production checks.
- Dev ergonomics policies: avoid spinning duplicate dev servers, run long-lived commands in tmux, reuse DevTools tabs, and remember that CLI shell commands already integrate with backend sessions.
- Complete-context directive: capture decisions/rationale from this conversation plus the GitHub issue (feature parity with TUI, UX improvements, testing expectations) within this document.

### Issue #61 Summary (Enhance shell command support in web interface)
- Problem: the web UI can run `!` shell commands but lacks TUI-level usability (multi-line inputs, proper formatting, history, indicators); the experience is hard to parse for long outputs or consecutive commands.
- Acceptance criteria from https://github.com/kcrommett/opencode-web/issues/61:
  - [ ] Enhance shell command output formatting (code blocks, syntax highlighting, ANSI handling).
  - [ ] Support multi-line shell command composition.
  - [ ] Provide command history storage plus suggestions/autocomplete.
  - [ ] Show visual indicators for running/success/failed commands.
  - [ ] Improve error handling/display for failed commands.
  - [ ] Add keyboard shortcuts for quicker shell command access.
- Additional implementation notes from the issue: reuse `/session/{id}/shell`, evaluate TUI patterns, extend UI components, update docs, and test on multiple platforms/browsers.

### Current Shell Command Flow (High-level)
- `src/lib/commandParser.ts`: `parseCommand` trims input and flags any `!`-prefixed string as `type: "shell"` with no multi-line awareness or structured args.
- `src/app/index.tsx`: `handleSend` routes shell commands to `handleShellCommand`, which injects a `$ {command}` pseudo-user message then awaits `runShell(currentSession.id, command, [])`; message history state (lines ~494 & ~2480) stores generic user inputs but lacks shell-specific metadata or multi-line editing helpers.
- `src/hooks/useOpenCode.ts`: exposes `runShell`, tracks session activity (`sessionActivity` map) and SSE events (`session.updated`, `session.idle`, `message.updated`) yet does not emit fine-grained shell-run telemetry or store stdout/stderr separately.
- `src/lib/opencode-client.ts` → `src/lib/opencode-server-fns.ts` → `src/lib/opencode-http-api.ts`: `runShell` posts to `/session/{sessionId}/shell` with `{ command, args?, directory? }` and returns `info`/`parts`; there is no server differentiation between slash tools vs shell commands yet.
- `src/app/_components/message/ToolPart.tsx` + `DiffPart.tsx`: render tool output/error/diff blocks but currently display shell output as plain text without ANSI color support, streaming status, or command metadata.
- `src/app/_components/ui/command-picker.tsx` and keyboard hooks (`src/hooks/useKeyboardShortcuts*.ts`): already provide slash-command completion infrastructure we can extend for shell-history search, `Shift+Enter` multi-line toggles, and dedicated shortcuts.

## Objectives & Success Criteria
- Achieve feature parity with the TUI shell experience: multi-line entry, history navigation, command metadata, and enriched formatting.
- Maintain compatibility with existing session/message pipeline (no breaking API changes) while layering better UX and telemetry.
- Keep the UI accessible: keyboard-first workflows, screen-reader friendly status labels, and responsive design for mobile inputs.
- Provide deterministic validation steps (unit tests + lint/typecheck + manual QA) so reviewers can trust regressions are caught.

## Technical Specifications
### APIs & Backend Contracts
| Name | Method & Path | Implementation Reference | Notes |
| --- | --- | --- | --- |
| Shell execution | POST `/session/{sessionId}/shell` | `src/lib/opencode-http-api.ts:355-379` via `openCodeService.runShell` (`src/lib/opencode-client.ts:306-320`) | Accepts `{ command, args?, directory? }`, returns `{ info, parts }`; extend payload to include user-facing metadata (duration, exit code) if available. |
| SSE session events | GET `/api/events?directory=…` | `openCodeService.subscribeToEvents` wiring in `src/hooks/useOpenCode.ts:1815-1849` | Emits `message.updated`, `session.idle`, etc.; use to flip command-running indicators and reconcile streaming shell output. |
| Command catalog | GET `/commands` (via `serverFns.getCommands` → `httpApi.getCommands`) | `src/lib/opencode-client.ts` & `src/lib/opencode-server-fns.ts:320-325` | Today returns slash commands; extend schema to include `category: "shell"` suggestions or reuse to seed autocomplete UI. |
| Messages fetch | GET `/session/{id}/messages` | `openCodeService.getMessages` consumed by `loadMessages` (`src/hooks/useOpenCode.ts:974-1110`) | Ensure shell responses keep structured `tool`/`text` parts for diffing and history playback. |

### Data Models & State
- `ParsedCommand` (`src/lib/commandParser.ts`): extend with optional `multiline: boolean`, `rawInput`, and `segments` arrays for newline-preserving payloads.
- `Message` + `Part` (`src/hooks/useOpenCode.ts` & `src/types/opencode.ts`): need to persist `toolData.shellLogs` and command metadata (duration, exit status) so `ToolPart` can render badges.
- `sessionActivity` map (`src/hooks/useOpenCode.ts:360-365`): already tracks running sessions; add `shellRuns[sessionId]` entries recording per-command states for UI badges.
- New `ShellHistoryEntry` (planned) stored per-session in `localStorage` (e.g., key `opencode-shell-history::<sessionId>`), containing `{ command: string, timestamp: number, exitCode?: number }`.
- Keyboard shortcut state from `src/hooks/useKeyboardShortcuts.ts` and `src/hooks/useKeyboardShortcutsWithContext.ts`: incorporate new bindings (e.g., toggle multi-line mode, open history palette).

### Configuration & Preferences
| Setting | Storage / Source | Default | Description |
| --- | --- | --- | --- |
| `shell.history.limit` | `localStorage` (`opencode-shell-history-limit`) | 50 | Caps persisted entries per session to avoid unbounded growth. |
| `shell.multiLineShortcut` | Constant in `src/app/index.tsx` (exposed via config section) | `Shift+Enter` | Defines newline insertion shortcut; expose in config dialog so users can customize. |
| `shell.outputTheme` | `OpenCodeConfig` (`src/lib/opencode-config.ts`) | `auto` | Controls whether ANSI colors are rendered, stripped, or converted to themed spans. |
| `shell.status.badges` | Derived from `sessionActivity` state | Enabled | Allows toggling visual indicators (useful for accessibility or screenshot clarity). |

### Integration Points
- `src/contexts/OpenCodeContext.tsx` must expose new shell history APIs for other components (e.g., future shell panes).
- `docs/SSE-EVENTS-DOCUMENTATION.md` and `docs/SSE-PROXY-DOCUMENTATION.md` need updates describing new statuses and payloads.
- `src/app/_components/message/TextPart.tsx` and `src/app/_components/message/PrettyDiff.tsx` may require adjustments to reuse formatting helpers for shell output.

## Proposed Enhancements & Decisions
### Enhanced Output Formatting & ANSI Support
- Normalize shell responses into tool parts containing structured stdout/stderr, exit codes, and duration; prefer streaming updates via SSE to avoid waits on long outputs.
- Extend `ToolPart` to detect `tool === "shell"` (or a dedicated `shellRun` flag) and apply ANSI-aware rendering (using `strip-ansi` for plaintext view plus `ansi-to-html` or a lightweight parser); wrap outputs in scrollable code blocks with copy buttons.
- Provide a compact summary header: `$ command`, exit code, elapsed time, working directory, and optional link to rerun/copy.

### Multi-line Command Support
- Support `Shift+Enter` (desktop) and toolbar toggle (mobile) to insert newline without sending.
- Update `parseCommand` / `handleSend` to preserve raw multi-line text, strip leading `!` only on first line, and allow chaining here-doc style (`!<<'EOF'`) if desired; start with newline detection to send entire block to backend as-is.
- Auto-expand the textarea height (CSS + React state) and display a gutter indicator showing multi-line mode.

### Command History & Suggestions
- Capture successful or failed shell commands into per-session history with deduping + MRU ordering.
- Provide a new history picker component (similar to `CommandPicker`) triggered by `Ctrl+R` (reverse-i-search) or `/` inside shell mode; suggestions should include timestamps, exit codes, and optional tags like `[failed]`.
- Add fuzzy matching (simple substring for MVP) and highlight matched tokens; allow pressing `Enter` to paste without execution vs `Ctrl+Enter` to replay immediately.

### Visual Indicators & Error Handling
- Surface session-level state (running / idle) near the editor plus inline badges on each shell message (running spinner, success, failure).
- Expand error handling to include `stderr` preview, exit code, and suggestions (e.g., "Check cwd" if exit code 127); maintain improved messaging for missing session errors (current `handleShellCommand` already warns).
- Provide toasts (via `openCodeService.showToast`) for background failures and log sanitized errors in dev mode only.

### Keyboard Shortcuts & Accessibility
- Map `Ctrl+Shift+.` (desktop) / long-press send button (mobile) to open shell history; `Ctrl+Enter` should execute even when focus is on multiline field; `Esc` should collapse multi-line mode without clearing text.
- Register shortcuts via `useKeyboardShortcuts` ensuring they respect current frame (workspace) and leader key semantics described in `src/app/index.tsx`.
- Announce status changes with `aria-live` regions so screen readers know when a command starts/finishes.

## Implementation Plan & Tasks
### Implementation Order
1. Research & specification updates (ensure API contracts + UX decisions are clear).
2. Parser & editor foundation (multi-line input, raw payload handling).
3. Execution & output enhancements (backend plumbing, formatting, ANSI support).
4. History, suggestions, and persistence layers.
5. Visual indicators, keyboard shortcuts, documentation, and validation.

### Milestone 1 – Research & Specs Lock (prereq for all)
- [x] Review TUI implementation (compare behaviors) and document deltas in `CONTEXT/IMPLEMENTATION-SUMMARY-2025-11-03.md` for traceability.
- [x] Finalize multi-line syntax + UX copy in `docs/SSE-EVENTS-DOCUMENTATION.md` and `docs/FILE-API-PATCH-INVESTIGATION.md` (mention shell updates).
- [x] Define data contract for shell results (stdout/stderr arrays, exit status, durations) and record in `docs/API-ENDPOINTS-DOCUMENTATION.md`.
- [x] Confirm backend exposes needed metadata (`server.ts` / `src/lib/opencode-server-fns.ts`); create follow-up issue if API gaps exist.

### Milestone 2 – Parser & Input Foundation (depends on Milestone 1)
 - [x] Update `src/lib/commandParser.ts` to preserve multi-line text, detect trailing `\` or here-doc sequences, and emit `segments` metadata.
 - [ ] Refactor input handling in `src/app/index.tsx` to:
   - [ ] Manage multiline mode state, auto-resize textarea, and show indicators.
   - [ ] Differentiate `Enter` vs `Shift+Enter` vs `Ctrl+Enter` so commands send correctly.
   - [ ] Prevent whitespace trimming for shell messages while keeping slash commands unaffected.
 - [x] Add unit tests (new `src/lib/commandParser.test.ts`) covering single-line, multi-line, escaped newline, and invalid scenarios.
 - [ ] Ensure `handleSend` resets navigation state only after dispatching command payload (avoid history corruption).

### Milestone 3 – Execution & Output Enhancements (depends on Milestone 2)
- [ ] Extend `runShell` (`src/hooks/useOpenCode.ts`) to pass structured payloads, capture timing, and mark session activity per command (including args array and new command ID).
- [ ] Update `openCodeService.runShell` / `serverFns.runCommand` / `src/lib/opencode-http-api.ts` to forward metadata and to return structured stdout/stderr with ANSI markers.
- [ ] Enhance `handleShellCommand` (`src/app/index.tsx`) to:
  - [ ] Create optimistic "running" message with placeholder parts.
  - [ ] Reconcile SSE-delivered updates vs immediate responses to avoid duplicates.
  - [ ] Attach exit codes, durations, and command text to `toolData`.
- [ ] Upgrade `ToolPart` (`src/app/_components/message/ToolPart.tsx`) & helper utilities (`src/lib/tool-helpers.ts`) to render ANSI-aware blocks, copy buttons, diff toggles, and optional streaming view.
- [ ] Document new message structure in `docs/SSE-EVENTS-DOCUMENTATION.md`.

### Milestone 4 – History, Suggestions, Persistence (depends on Milestone 3)
- [ ] Implement `useShellHistory` helper (new module under `src/hooks/`) that syncs with `localStorage`, enforces limit, and exposes search APIs.
- [ ] Integrate history with editor:
  - [ ] Update `src/app/index.tsx` to push executed commands into history on success/failure with metadata.
  - [ ] Provide MRU navigation via `ArrowUp/Down` scoped to shell mode while preserving existing general history.
- [ ] Build `ShellHistoryPicker` component (extend `src/app/_components/ui/command-picker.tsx` or create new) with filtering, keyboard navigation, and metadata chips.
- [ ] Add persisted preferences UI in config modal (likely `src/app/_components/ui/config.tsx` or equivalent) so users can clear history, toggle storing, or adjust limit.
- [ ] Write integration tests (Playwright or React Testing Library) verifying history retrieval and suggestion selection.

### Milestone 5 – Visual Indicators, Shortcuts, Docs & Validation (depends on Milestones 3–4)
- [ ] Add command status badges + progress bars near editor (new component under `src/app/_components/message/` or workspace header) using `sessionActivity` + new shell-run state.
- [ ] Register keyboard shortcuts in `src/hooks/useKeyboardShortcuts.ts` and document them in the help dialog plus `README.md` shell section.
- [ ] Improve error displays: include collapsible stderr, shareable rerun button, and optional "Report issue" CTA.
- [ ] Update documentation (`README.md`, `docs/SSE-EVENTS-DOCUMENTATION.md`, `docs/MCP_STATUS_USAGE.md`) and add screenshots under `docs/screenshots/` if the UI changed.
- [ ] Run full validation suite (lint, typecheck, tests, build) and capture results for PR summary.

## Validation Criteria
### Automated Checks
```
bun run lint
bun x tsc --noEmit
bun run test
bun run build
```
- Add targeted unit tests for `parseCommand`, `useShellHistory`, and ANSI formatting helpers.
- Ensure snapshot or component tests cover new UI states (running, success, failure).

### Manual QA Checklist
- [ ] Execute single-line command (`!ls`) and confirm formatting + status badges render.
- [ ] Execute multi-line command (e.g., `!cat <<'EOF' … EOF`) and verify backend receives full payload plus output formatting.
- [ ] Confirm history picker stores commands per session, dedupes, and respects limit; test clearing history.
- [ ] Validate keyboard shortcuts: `Shift+Enter` newline, `Ctrl+Enter` execute, `Ctrl+R` history search, `Esc` exit multi-line mode.
- [ ] Simulate backend failure (disconnect or command error) and confirm UI shows stderr, exit code, and notifications.
- [ ] Test on desktop (Chrome, Firefox) and mobile viewport (Safari iOS or responsive emulator) for layout resilience.

### Observability & Telemetry
- Ensure `sessionActivity` toggles on command start/finish; log warnings in dev mode only (`process.env.NODE_ENV !== "production"`).
- Consider emitting structured analytics event (if telemetry pipeline exists) when shell command fails to help prioritize improvements.
- Monitor SSE logs for duplicate `message.updated` events to avoid double-rendering results.

## Code References
### Internal
| Path | Purpose |
| --- | --- |
| `src/lib/commandParser.ts` | Detects slash/shell/file/plain commands; target for multi-line parsing upgrades. |
| `src/app/index.tsx` | Primary workspace UI, message handling, keyboard shortcuts, shell dispatch logic. |
| `src/hooks/useOpenCode.ts` | Core state machine (sessions, messages, `runShell`, SSE listeners, history state). |
| `src/lib/opencode-client.ts` | Client wrapper calling `serverFns`; houses `runShell`. |
| `src/lib/opencode-server-fns.ts` | TanStack server functions bridging to HTTP API endpoints. |
| `src/lib/opencode-http-api.ts` | Low-level fetchers hitting `/session/{id}/shell` and other endpoints. |
| `src/app/_components/message/ToolPart.tsx` | Renders tool (shell) outputs, statuses, errors. |
| `src/app/_components/message/TextPart.tsx` & `src/app/_components/message/PrettyDiff.tsx` | Render textual outputs/diffs, potential reuse for ANSI support. |
| `src/app/_components/ui/command-picker.tsx` | Command suggestion UI foundation for shell history picker. |
| `docs/SSE-EVENTS-DOCUMENTATION.md`, `docs/API-ENDPOINTS-DOCUMENTATION.md` | Reference docs requiring updates post-change. |

### External
- `https://github.com/xtermjs/xterm.js` — reference for advanced terminal rendering patterns (ANSI handling, input UX).
- `https://github.com/chalk/ansi-styles` — ANSI parsing utilities useful for color translation.
- `https://github.com/chalk/strip-ansi` — lightweight helper to sanitize logs before fallback rendering.
- `https://github.com/vercel/hyper` — inspiration for command history search UI/keyboard shortcuts.

## Risks & Mitigations
- **Multi-line parsing collisions**: Reusing `!` prefix with new newline semantics could misinterpret slash commands; mitigate with clear delimiter rules and parser tests.
- **History persistence & privacy**: Storing shell commands (which may contain secrets) locally could leak; add opt-out toggle and document retention policy.
- **ANSI rendering performance**: Large outputs may degrade performance if fully highlighted; implement lazy rendering + collapse long logs by default.
- **SSE synchronization**: Duplicate or out-of-order events could append repeated outputs; ensure command IDs and reconciliation logic dedupe events.
- **Keyboard shortcut conflicts**: New bindings might clash with browser/system shortcuts; provide customization and follow platform conventions (e.g., `Cmd` on macOS).
