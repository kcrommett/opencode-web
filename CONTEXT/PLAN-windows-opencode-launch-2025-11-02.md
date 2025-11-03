## Purpose & Scope
This document captures the full context and delivery plan for Issue #44: ensuring Windows hosts launch their locally installed OpenCode server instead of the bundled SDK instance while keeping cross-platform behavior intact. It records the decisions made, technical considerations, actionable tasks, and validation approach required to ship the change without re-establishing context.

## Context Capture
### Issue Summary
- GitHub Issue #44 directs us to change Windows startup behavior so `bunx opencode-web` invokes the user-installed `opencode server` via `cmd`, wiring through the requested host and port instead of spinning up the bundled SDK server.
- The web UI itself already builds and runs on Windows; only the server bootstrap path needs adjustment.

### Decisions & Rationale
- Continue using `@opencode-ai/sdk#createOpencode` on non-Windows platforms because it is stable, requires no extra dependencies, and keeps current UX unchanged.
- On Windows (`process.platform === "win32"` under Bun), shell out to `cmd.exe /c opencode server` so we rely on the user’s existing CLI install, avoiding shipping binaries or managing services ourselves.
- Pass host/port arguments provided via CLI flags or environment variables to the spawned `opencode` process to maintain parity with the Bun workflow.
- Re-use existing environment variable wiring (`VITE_OPENCODE_SERVER_URL`, `OPENCODE_SERVER_URL`) so downstream TanStack Start server code keeps working without additional branching.
- Preserve the `--external-server` / `--no-bundled-server` flags: if the user opts out of the bundled server we should skip any Windows-specific spawning and honor their configuration.

### Constraints & Assumptions
- Bun runtime is required (`bin/opencode-web.js` already enforces this); plan must stay Bun-compatible.
- `opencode` CLI is assumed to be on the user’s PATH on Windows; validation must include graceful failure messaging when it is missing.
- Host/port forwarding must continue to respect CLI order of precedence: explicit flag > env var > default.
- Process lifecycle cleanup must mirror existing bundled-server shutdown, including signal handling (`SIGINT`, `SIGTERM`, `exit`).

## Technical Landscape
### Internal Code References
- `packages/opencode-web/bin/opencode-web.js` – CLI entry point that parses flags, starts the bundled server, and boots the web server.
- `packages/opencode-web/server.ts` – Production server setup; consumes `OPENCODE_SERVER_URL` / `VITE_OPENCODE_SERVER_URL` for proxying requests.
- `packages/opencode-web/package.json` – Declares CLI binary and dependency footprint; will stay unchanged but is relevant for release notes.
- `docs/SSE-PROXY-DOCUMENTATION.md` – Describes existing proxy flow to the OpenCode server; useful for documenting any behavioral changes.
- `src/lib/opencode-config.ts` – Centralizes OpenCode client configuration; verify no adjustments needed after altering server URL provisioning.

### External References
- https://github.com/opencode-ai/opencode.git – Upstream OpenCode CLI repository (source for `opencode server` behavior and flags).
- https://github.com/opencode-ai/opencode/blob/main/cmd/root.go – Entry point defining Cobra commands; inspect to confirm flag names and server command wiring.
- https://github.com/opencode-ai/opencode/blob/main/internal/app/app.go – Core application bootstrap invoked by the CLI; review to understand how server configuration is applied.

### OpenCode Server API Surface
- UI relies on the OpenCode HTTP/SSE API exposed by the CLI or bundled server:
  - `GET /event` (proxied via `server.ts` as `/api/events`) for session streaming.
  - REST/JSON RPC endpoints under `/api/*` (proxied by TanStack Start handlers) configured through `OPENCODE_SERVER_URL`.
- Windows adjustments must ensure the spawned CLI exposes identical endpoints on the negotiated host/port so no downstream code changes are required.

### Configuration Matrix
| Setting | Source of Truth | Purpose | Notes |
| --- | --- | --- | --- |
| `PORT` | CLI `--port` flag → `process.env.PORT` | Web UI HTTP port | Defaults to `3000` if unspecified. |
| `HOST` | CLI `--host` flag → `process.env.HOST` | Web UI listen address | Default `127.0.0.1`; forwarded to OpenCode server when non-default. |
| `OPENCODE_WEB_DISABLE_BUNDLED_SERVER` | Environment flag | Forces skip of bundled/local server | Overrides Windows spawning as well. |
| `--external-server` / `VITE_OPENCODE_SERVER_URL` | CLI flag or env | Use pre-existing OpenCode server URL | Should bypass all auto-start logic. |
| `OPENCODE_SERVER_PORT` | Optional env | Desired port for bundled server | When set, pass through to CLI invocation on Windows. |
| `OPENCODE_SERVER_HOSTNAME` | Optional env | Desired host for bundled server | Same forwarding as above. |
| `VITE_OPENCODE_SERVER_URL` / `OPENCODE_SERVER_URL` | Derived | Consumed by frontend & server proxy | Must be set after Windows CLI launches to the resolved base URL. |

## Implementation Strategy
### Milestone 1 – Baseline Behavior Audit
- [x] Confirm current option precedence and environment fallbacks in `packages/opencode-web/bin/opencode-web.js`.
- [x] Document existing cleanup flow (`stopOpencodeServer`) to mirror when switching to an external process.
- [x] Review upstream OpenCode CLI docs/flags (`opencode serve --help` or source) to determine supported host/port arguments and output format for URL discovery.

### Milestone 2 – Windows Launch Adapter
- [x] Introduce platform guard (`process.platform === "win32"`) to branch between SDK server and CLI spawning.
- [x] Implement `opencode serve` invocation using `Bun.spawn` with appropriate arguments for `--hostname`/`--port`.
- [x] Capture stdout/stderr to detect the announced server URL; parse and set `VITE_OPENCODE_SERVER_URL` / `OPENCODE_SERVER_URL` once the CLI reports readiness.
- [x] Ensure failure scenarios (missing CLI, non-zero exit) print actionable errors and exit gracefully before starting the web server.
- [x] Register cleanup handler that terminates the spawned process on signals, matching existing behavior.

### Milestone 3 – Cross-Platform Parity & Configuration Updates
- [x] Preserve existing SDK path for macOS/Linux; confirm no regression in environment propagation when not on Windows.
- [x] Respect `--external-server` and `--no-bundled-server` flags by skipping Windows spawning entirely when either is present.
- [x] Update logging to clearly indicate whether the bundled SDK or local CLI server was launched.
- [x] Audit downstream config consumers (`src/lib/opencode-config.ts`, `docs/SSE-PROXY-DOCUMENTATION.md`) for any wording updates required to mention Windows behavior.

### Milestone 4 – Validation & Release Prep
- [ ] Add or update automated coverage (unit/integration) around CLI option parsing if feasible (e.g., abstract spawn logic behind injectable helper for testing).
- [ ] Manually verify on Windows: run `bunx opencode-web --host 127.0.0.1 --port 3000` ensuring the CLI server launches and UI connects.
- [ ] Manually verify on macOS/Linux: ensure SDK path still works and cleanup remains effective.
- [x] Execute project QA commands:
  ```bash
  bun run lint
  bun x tsc --noEmit
  bun run test
  ```
- [x] Draft release notes mirroring change (mention Windows host behavior) and confirm no packaging adjustments are required in `packages/opencode-web/package.json`.

## Implementation Order & Dependencies
1. Complete Milestone 1 to lock in configuration details and verify CLI arguments before writing code.
2. Ship Milestone 2 to introduce Windows-specific launch logic once the argument contract is understood.
3. Follow with Milestone 3 to ensure parity features (flags, logging, docs) are in place; depends on the spawn implementation.
4. Finish with Milestone 4 validations and release preparation after functional work is merged.

## Validation Criteria
- Bundled SDK path continues to pass smoke tests on non-Windows hosts (web UI reachable, server logs show SDK startup).
- Windows run spawns `opencode server`, surfaces reachable URL in logs, and sets `VITE_OPENCODE_SERVER_URL` / `OPENCODE_SERVER_URL` correctly so UI can connect.
- Graceful shutdown verified on both paths (Ctrl+C stops both web server and whichever OpenCode server was started).
- `--external-server` flag continues to bypass any auto-launch with no regressions.
- Repository linting, type-checking, and test suites succeed.

## Risks & Mitigations
- **Risk:** `opencode server` emits logs asynchronously causing race conditions before URL detection. **Mitigation:** buffer stdout until readiness line appears; add timeout/fallback error if never detected.
- **Risk:** Users without OpenCode installed on Windows encounter cryptic errors. **Mitigation:** detect spawn ENOENT and provide guided remediation message (install link / `brew install` equivalent).
- **Risk:** Future SDK upgrades diverge behavior between platforms. **Mitigation:** encapsulate server starter logic behind a shared helper so future changes apply across branches.

## Documentation & Communication
- [x] Update Windows setup instructions in README or docs to note the dependency on a locally installed OpenCode CLI.
- [x] Capture behavior change in the project changelog/release notes referencing Issue #44.
- [ ] Notify maintainers that CI on Windows (if available) should include a scenario with a mocked `opencode` binary for regression coverage.

## Release Notes Summary

### Windows Support for OpenCode Web (Issue #44)

**What Changed:**
- OpenCode Web now properly supports Windows hosts by spawning the user's locally installed `opencode` CLI instead of relying on the bundled SDK
- Windows users must have the OpenCode CLI installed and accessible in their PATH
- macOS and Linux continue to use the bundled SDK with no changes required

**Technical Details:**
- Added platform detection (`process.platform === "win32"`) to branch between SDK and CLI server startup
- Implemented `startWindowsOpencodeServer()` function that spawns `opencode serve` using Bun.spawn
- Parses stdout for "opencode server listening on" message to detect server URL
- Provides helpful error messages when OpenCode CLI is not found on Windows
- Respects all existing flags (`--external-server`, `--no-bundled-server`, `--host`, `--port`)
- Cleanup handlers work consistently across all platforms

**User Impact:**
- **Windows users**: Must install OpenCode CLI before running opencode-web (see installation instructions)
- **macOS/Linux users**: No changes required, continues to work as before
- All users: Same command-line interface and configuration options

**Breaking Changes:**
- None for existing users on macOS/Linux
- Windows users who previously ran opencode-web without the CLI installed will now see a clear error message with installation instructions
