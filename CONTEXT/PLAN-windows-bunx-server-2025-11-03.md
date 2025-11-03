## Background & Context Capture
- Windows users can successfully launch the bundled OpenCode Server when running `bun run packages/opencode-web/bin/opencode-web.js`, but `bunx opencode-web@latest` fails because Bun cannot locate `/bin/sh`, causing the OpenCode server bootstrap to exit with code 255.
- Until Bun fixes its bin remapping on Windows, we must clearly instruct users that `bunx` cannot launch the bundled server; they must either pass `--external-server <url>` or install the package locally via `bun install && bun run build && bun run opencode-web` so the Windows binary is available.
- We will update docs, CLI error messages, and console warnings to steer Windows `bunx` workflows toward `--external-server`, while highlighting that local installs still offer automatic server launch.
- We may also prepare an upstream issue or PR for `sst/opencode` (and potentially `oven-sh/bun`) to improve Windows support, but the immediate focus is documentation and UX clarity in this repo.

### Reproduction Evidence
```powershell
PS C:\Users\shuv\repos\opencode-web> bun run .\packages\opencode-web\bin\opencode-web.js
OpenCode Web v0.5.1
Starting local OpenCode Server (Windows)...
Spawning local OpenCode CLI: opencode serve --hostname=127.0.0.1 --port=4096
OpenCode Server 1.0.16 listening at http://127.0.0.1:4096
...
PS C:\Users\shuv\repos\opencode-web> bunx opencode-web@latest
OpenCode Web v0.5.5
Starting local OpenCode Server (Windows)...
[ERROR] Failed to start OpenCode Server.
error: interpreter executable "/bin/sh" not found in %PATH%
```

## Goals & Non-Goals
- **Goals**: Document the Windows `bunx` caveat, add runtime detection and actionable messaging, provide troubleshooting steps, and define validation for 
Windows dev flows. Optionally stage upstream contributions describing the Bun defect.
- **Non-Goals**: Fix Bun itself, rewrite the OpenCode Server launcher, or ship a new Windows installer.

## Internal Code References
| Path | Purpose |
| --- | --- |
| `packages/opencode-web/bin/opencode-web.js:18-224` | CLI entry point; parses `--external-server`, controls server startup, and emits console guidance. |
| `packages/opencode-web/server.ts:55-195` | Bun server for TanStack Start bundle; proxies `/api/events` to the OpenCode server and enforces `VITE_OPENCODE_SERVER_URL`. |
| `README.md` | Primary onboarding instructions; needs a Windows section describing `bunx` limitations and alternatives. |
| `docs/SSE-PROXY-DOCUMENTATION.md` | Explains server proxying; update with Windows-specific notes on how `/api/events` relies on a reachable OpenCode server. |
| `docs/API-ENDPOINTS-DOCUMENTATION.md` | Reference for OpenCode HTTP endpoints; include clarification for Windows host/port defaults when using `--external-server`. |
| `docs/SSE-EVENTS-DOCUMENTATION.md` & `docs/SSE-PROXY-DOCUMENTATION.md` | Detail SSE integration; add troubleshooting tips when the server cannot start on Windows. |
| `packages/opencode-web/package.json` | Hosts the `bin` declaration consumed by `bunx`; mention in docs for local install workflows. |

## External References
- `https://github.com/sst/opencode` – upstream CLI and server implementation; potential target for improving Windows `bunx` compatibility.
- `https://github.com/opencode-ai/opencode` – Windows binaries referenced by `packages/opencode-web/bin/opencode-web.js` when launching the local server.
- `https://github.com/oven-sh/bun/issues` – location to cite/track the `/bin/sh` remapping bug impacting `bunx` on Windows.

## Technical Specifications
### CLI Behavior & Flags
- `--external-server <url>` / `-s <url>` overrides bundled server startup by setting `OPENCODE_SERVER_URL` & `VITE_OPENCODE_SERVER_URL` (`packages/opencode-web/bin/opencode-web.js:89-220`).
- `--no-bundled-server` / `--disable-bundled-server` disable automatic server launch, forcing users to supply a URL.
- When no external server is supplied, Windows flows call `startWindowsOpencodeServer` which wraps `cmd.exe /c opencode serve --hostname=HOST --port=PORT` (`packages/opencode-web/bin/opencode-web.js:225-352`).

### API, Data, and Config Surface
| Component | Endpoint/Config | Notes |
| --- | --- | --- |
| OpenCode Server CLI | `opencode serve --hostname=127.0.0.1 --port=4096` | Same defaults surfaced in Windows launcher; fails under `bunx` due to missing `/bin/sh`. |
| Web Server Proxy | `/api/events` → `${OPENCODE_SERVER_URL}/event?directory=...` | Requires reachable server; misconfig is currently warned at runtime (`packages/opencode-web/server.ts:133-195`). |
| Required Env Vars | `VITE_OPENCODE_SERVER_URL`, `OPENCODE_SERVER_URL`, `OPENCODE_SERVER_HOSTNAME`, `OPENCODE_SERVER_PORT` | Need documentation for Windows flows so users can point to an already running server. |
| CLI Flag Interaction | `--host`, `--port`, `--external-server`, `OPENCODE_WEB_DISABLE_BUNDLED_SERVER` | Determine combined behavior when bundling fails; doc updates must present decision tree. |

### Integration Points
- Installer flow relies on `node_modules/.bin` resolution; Bun's `bunx` temp install skips shipping `opencode.exe`, so CLI must instruct users to run `bun install` or `bun run` from a workspace where dependencies materialize.
- SSE proxy and UI rely on `__OPENCODE_CONFIG__` injection (see `packages/opencode-web/server.ts:41-53`); docs should outline how to configure Windows deployments hosted elsewhere.

## Actionable Task Breakdown
### Milestone 1 – Detect bunx-on-Windows & Author Messaging Copy
- [x] Define heuristic for Bun temporary installs (e.g., inspect `process.env.npm_execpath`, working directory pattern, or `process.argv[1]` containing `bunx-<random>`).
- [x] Draft CLI log/error copy explaining the limitation and suggesting `--external-server` or local install commands.
- [x] Decide whether to exit early or continue with clearer failure guidance when detection triggers.

### Milestone 2 – Documentation Updates
- [x] `README.md`: Add "Windows + bunx" subsection covering reproduction, required flags, and recommended commands (`bun install`, `bun run dev`, `bun run packages/opencode-web/bin/opencode-web.js`).
- [x] `docs/API-ENDPOINTS-DOCUMENTATION.md` & `docs/SSE-PROXY-DOCUMENTATION.md`: Describe how `/api/events` depends on `VITE_OPENCODE_SERVER_URL` and how Windows users should point to `http://127.0.0.1:4096` or custom hosts via `--external-server`.
- [x] `docs/SSE-EVENTS-DOCUMENTATION.md`: Add troubleshooting entry for `error: interpreter executable "/bin/sh" not found in %PATH%` with remediation steps.
- [x] Cross-link to upstream Bun issue for visibility.

### Milestone 3 – Runtime Error & Console Output Enhancements
- [x] Update `packages/opencode-web/bin/opencode-web.js` to detect `bunx` on Windows and emit a preflight warning before attempting to spawn `opencode`.
- [x] Modify failure handler (`packages/opencode-web/bin/opencode-web.js:472-489`) to append actionable instructions (exact `bun install` commands, `--external-server` usage, and docs link).
- [x] When users pass `--external-server`, log explicit confirmation plus reminder that this is required inside `bunx` shells on Windows.

### Milestone 4 – Validation & Release Readiness
- [x] Create a test matrix covering `bun run`, `bunx`, and `bun install && bun run` on Windows (manual for now) plus Linux/macOS sanity checks.
- [x] Automate a smoke test script (PowerShell) that asserts CLI exits with the new warning when run via simulated `bunx` path.
- [x] Update release notes / changelog (if applicable) to mention the new guidance once verified.

### Milestone 5 – Upstream Coordination
- [ ] File/triage an issue in `sst/opencode` describing the Bun remapping limitation, referencing this repo's mitigation.
- [ ] Optionally open an issue in `oven-sh/bun` if no existing ticket documents `/bin/sh` on Windows for `bunx`; include reproduction commands and desired outcome.
- [ ] Track upstream resolution status inside `CONTEXT/PLAN-windows-bunx-server-2025-11-03.md` or a follow-up note.

**Note**: Milestone 5 tasks are deferred until after internal validation of the implemented solution. Once Windows users confirm the workarounds are effective, upstream issues will be filed with:
- Exact reproduction steps
- Link to this repository's mitigation strategy
- Error messages and expected behavior
- References to the comprehensive documentation added in Milestones 1-4

## Implementation Order & Dependencies
1. **Milestone 1** (detection + copy) must precede code/doc edits so wording aligns everywhere.
2. **Milestone 2** (docs) depends on finalized copy from Milestone 1.
3. **Milestone 3** builds on both earlier milestones to keep CLI output consistent with published docs.
4. **Milestone 4** validates the messaging and ensures Windows users can follow the documented flow before release.
5. **Milestone 5** happens after internal fixes so we can link to shipped guidance when filing upstream.

## Validation Criteria
- Windows + `bunx` run prints the new warning, instructs users to pass `--external-server`, and exits gracefully without misleading stack traces.
- Windows + local install (`bun install`, `bun run dev`, `bun run packages/opencode-web/bin/opencode-web.js`) still auto-starts OpenCode Server with no regressions.
- Docs clearly differentiate between `bunx` and local workflows; internal reviewers can follow README steps to reach a working UI on Windows.
- SSE proxy documentation reflects new requirements, and `/api/events` functions once `VITE_OPENCODE_SERVER_URL` is set according to the instructions.
- Manual PowerShell smoke test confirms CLI behavior under each scenario in the test matrix.
- Upstream issues/PRs reference this repository and include the exact error text plus remediation summary.

## Appendix – Recommended Commands
```powershell
# Local install path (bundled server works)
bun install
bun run build
bun run packages/opencode-web/bin/opencode-web.js

# bunx workaround using external server
bunx opencode-web@latest --external-server http://127.0.0.1:4096
```
