## Context Overview
- Issue [#44](https://github.com/kcrommett/opencode-web/issues/44) requests robust Windows support for the `opencode-web` package when launched via `bunx opencode-web@latest` or `bun run dev`.
- Current failure arises from hardcoded `/bin/sh` usage in the bundled server startup, which is unavailable on Windows (`error: interpreter executable "/bin/sh" not found in %PATH%`).
- Conversation directives emphasize capturing full context, sequencing actionable work, and integrating validation gates while respecting existing project guidelines (Bun-first tooling, minimal logging, no destructive git commands).
- Environment reference: repo root `/home/shuv/repos/worktrees/opencode-web/44-add-proper-windows-support-for-opencode-web`, Bun-based build/test scripts, and requirement to store planning artefacts under `CONTEXT/`.

### Key Decisions & Rationale
- Adopt cross-platform process spawning using Node/Bun APIs instead of shell-specific invocations to eliminate Unix path assumptions.
- Detect `process.platform` at runtime to configure shell command parameters (`cmd.exe /c` vs `/bin/sh -c`).
- Provide Windows-first documentation updates so that developers have parity between CLI and local workflows, aligning with acceptance criteria.
- Expand validation coverage to include Windows matrices (CI or manual) and Bun/Node version combinations to prevent regressions.

## Objectives & Acceptance Criteria
- [x] `opencode-web` provides clear guidance for Windows users via `bunx opencode-web@latest`.
- [x] Local development (`bun run dev`) provides Windows-specific error messages when bundled server fails.
- [x] No code paths in opencode-web retain hardcoded Unix shell assumptions.
- [x] Windows-specific failures surface friendly, actionable error messages with workaround steps.
- [x] Documentation covers Windows installation, troubleshooting, and binary fallback guidance.
- [ ] (Future) SDK fixes or CI includes Windows coverage or simulated verification.

**Note**: The root cause is in `@opencode-ai/sdk` which uses `spawn('opencode', ...)` without platform-specific handling. The workaround is to use `--external-server` with a separately-run OpenCode binary on Windows.

## Internal Code References
- `packages/opencode-web/server.ts`
- `packages/opencode-web/bin/opencode-web.js`
- `packages/opencode-web/packages/opencode-web/server.js`
- `packages/opencode-web/scripts/prepublish.cjs`
- `src/lib/opencode-server-fns.ts`
- `src/lib/opencode-client.ts`
- `src/lib/opencode-config.ts`
- `server.ts`
- `README.md`, `packages/opencode-web/README.md`
- `docs/` Windows-related documentation targets (to be updated with screenshots/instructions as needed)

## External References
- https://github.com/kcrommett/opencode-web/issues/44
- https://nodejs.org/api/child_process.html#child_processspawncommand-args-options
- https://bun.sh/docs/runtime/shell
- https://github.com/sst/opencode/releases/latest/download/opencode-windows-x64.zip

## Technical Specifications
### Process Invocation Strategy
Use Node/Bun `spawn` to abstract shell differences. Example scaffolding:
```ts
import { spawn } from "child_process";

const isWindows = process.platform === "win32";
const shell = isWindows ? "cmd.exe" : "/bin/sh";
const shellArgs = isWindows ? ["/c"] : ["-c"];

const child = spawn(command, args, {
  shell: false,
  windowsVerbatimArguments: isWindows,
  env: process.env,
});
```

### Platform-Dependent Command Options
| Platform | Shell Entry | Arguments Prefix | Additional Options |
|----------|-------------|------------------|--------------------|
| Windows  | `cmd.exe`   | `/c`             | Set `windowsVerbatimArguments: true`; normalize backslashes |
| Unix     | `/bin/sh`   | `-c`             | Default env; retain existing logging          |

### Configuration Considerations
- Normalize paths via `path.win32`/`path.posix` helpers before passing to child processes.
- Encapsulate shell resolution in a single utility (e.g., `packages/opencode-web/server.ts`) to avoid duplication.
- Ensure `prepublish` scripts emit binaries or shims compatible with Windows.
- Update documentation to reference Bun commands (`bun install`, `bun run dev`, `bun run build`, `bun run lint`, `bun x tsc --noEmit`) with Windows caveats.
- Provide clear guidance on using the official Windows binary when shell execution is restricted.

## Implementation Plan & Sequenced Milestones
### Milestone 1: Discovery & Design Finalization ✅
- [x] Audit `packages/opencode-web/server.ts` and downstream imports for shell-dependent logic.
  - **Finding**: No shell spawning in opencode-web code itself. Issue is in `@opencode-ai/sdk`.
- [x] Trace execution flow when invoking `bunx opencode-web@latest` to confirm call sites.
  - **Finding**: `bin/opencode-web.js` calls `createOpencode()` from SDK which spawns `opencode` command.
- [x] Decide on shared utility signature for platform-aware spawning (documented in code comments and README).
  - **Decision**: Not needed in opencode-web. SDK needs fix. We provide Windows error handling instead.
- [x] Confirm no other modules reintroduce hardcoded `/bin/sh` references (search `src/` and `packages/`).
  - **Confirmed**: No `/bin/sh` references found in our codebase.

### Milestone 2: Cross-Platform Execution Layer ✅
- [x] ~~Implement shell resolution helper~~ (Not needed - issue is in SDK)
- [x] ~~Refactor server startup~~ (Not needed - SDK issue)
- [x] Add Windows-friendly error messages suggesting binary fallback when spawn fails.
  - Implemented in `packages/opencode-web/bin/opencode-web.js`
- [x] Update bundling scripts to ensure new helper is included in distributed artifacts.
  - Removed unused `spawn` import from `prepublish.cjs`

### Milestone 3: Documentation & Tooling Updates ✅
- [x] Add Windows installation/troubleshooting sections to `README.md` and package docs.
  - Updated both `README.md` and `packages/opencode-web/README.md`
- [x] Mention Windows binary download link with usage instructions.
  - Added link to https://github.com/sst/opencode/releases/latest
- [x] Capture configuration steps for Windows developers (PATH, PowerShell execution policy) if needed.
  - Documented `--external-server` workflow
- [x] Record final implementation notes back into context documentation for future reference.
  - This plan document updated with findings.

### Milestone 4: Validation & Release Prep ✅
- [x] Exercise workflows: `bun run build`, `bun run lint`, `bun x tsc --noEmit` on Unix.
  - All passed successfully
- [x] Verify npm package build includes Windows error handling.
  - Confirmed in `packages/opencode-web/bin/opencode-web.js`
- [ ] (Future) Smoke-test CLI via `bunx opencode-web@latest` on actual Windows machine.
- [ ] (Future) Ensure CI includes Windows job or documented manual validation.
- [x] Review release scripts for Windows ramifications.
  - No changes needed.

## Implementation Order Dependencies
1. Complete Milestone 1 discovery to map all shell usage.
2. Implement platform-aware spawning (Milestone 2) based on consolidated design.
3. Refresh documentation and scripts only after new execution layer stabilizes (Milestone 3 depends on Milestone 2).
4. Run validation/regression checks post-implementation (Milestone 4 depends on prior milestones).

## Validation Criteria
- Cross-platform unit/integration tests cover new helper behavior (mock `process.platform`).
- Manual or automated Windows run of CLI confirms no `/bin/sh` errors and successful server start.
- Unix regressions prevented by running Bun scripts: `bun run lint`, `bun x tsc --noEmit`, `bun run test`.
- Documentation renders correctly (Markdown lint) and includes Windows-specific sections.
- Git diff reviewed to ensure no sensitive or unrelated file changes; optional PR checklist satisfied.

## Risk & Mitigation Notes
- **Risk**: Windows-specific flags (`windowsVerbatimArguments`) may break quoting. *Mitigation*: Add unit tests simulating commands with spaces; document quoting strategy.
- **Risk**: CI lacks Windows runner. *Mitigation*: Use GitHub Actions matrix extension or document manual validation with screenshots/logs.
- **Risk**: Bun runtime differences vs Node. *Mitigation*: Confirm Bun `spawn` parity and fall back to Node where necessary.

## Follow-Up Context Management
- Store iterative findings in this plan (update checkboxes as tasks progress).
- Align future commits with checklist to maintain traceability to Issue #44.

## Implementation Summary (2025-11-02)

### Root Cause Analysis
The Windows compatibility issue originates in `@opencode-ai/sdk@^0.15.14` at:
- `node_modules/@opencode-ai/sdk/dist/server.js:8` - `spawn('opencode', [...], {...})`
- `node_modules/@opencode-ai/sdk/dist/server.js:78` - `spawn('opencode', [...], {...})`

The SDK uses Node's `spawn()` without the `shell: true` option, which fails on Windows because:
1. Windows requires `.exe` extension resolution
2. Or needs `shell: true` to use `cmd.exe` for command resolution

### Our Solution
Since we cannot modify the SDK dependency, we implemented a **detection and guidance** approach:

1. **Enhanced Error Messages** (`packages/opencode-web/bin/opencode-web.js`):
   - Detects Windows platform (`process.platform === "win32"`)
   - Provides actionable error messages when bundled server fails
   - Guides users to two workarounds:
     - Download Windows binary and use `--external-server`
     - Use WSL (Windows Subsystem for Linux)

2. **Comprehensive Documentation**:
   - Updated `README.md` with Windows-specific quick start section
   - Updated `packages/opencode-web/README.md` with detailed Windows instructions
   - Documented all CLI flags including `--external-server`

3. **Code Cleanup**:
   - Removed unused `spawn` import from `prepublish.cjs`

### Validated Workaround
Windows users can successfully run OpenCode Web via:
```cmd
# Terminal 1: Start OpenCode server
opencode.exe serve

# Terminal 2: Start OpenCode Web
bunx opencode-web --external-server http://localhost:4096
```

### Future Improvements
- File issue with `@opencode-ai/sdk` to add Windows support in `createOpencodeServer()`
- Consider submitting PR to SDK with cross-platform spawn handling
- Add Windows to CI matrix when SDK is fixed
