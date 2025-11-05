# Changelog

All notable changes to opencode-web will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Environment Variable Simplification** (#80)
  - Consolidated configuration to three canonical environment variables:
    - `OPENCODE_SERVER_URL` (replaces `VITE_OPENCODE_SERVER_URL`)
    - `OPENCODE_WEB_HOST` (replaces `HOST`)
    - `OPENCODE_WEB_PORT` (replaces `PORT`)
  - Implemented centralized configuration resolver with backward compatibility
  - Legacy variables (`PORT`, `HOST`, `VITE_OPENCODE_SERVER_URL`, `OPENCODE_SERVER_PORT`, `OPENCODE_SERVER_HOSTNAME`) still supported but deprecated
  - Added deprecation warnings in development mode for legacy variable usage
  - Updated all documentation (README, .env.example) to reflect canonical variables
  - Added migration guide with clear mapping from old to new variable names
  - Configuration precedence: CLI flags → Canonical env vars → Legacy env vars → Defaults

### Fixed
- Chat window overflow when right sidebar is resized (#123)
  - Chat messages now properly wrap and reflow when sidebar widths change
  - Message bubbles, diffs, and file previews respect available width
  - Sidebar drag handles prevent resizing beyond minimum chat width (320px)
  - Applied `min-w-0` and `overflow-hidden` to all flex containers
  - Enhanced `Pre`, `DiffPart`, `FilePart`, and `PatchPart` components with proper width constraints

### Added
- Windows `bunx` limitation detection and graceful error handling
  - Automatically detects when running via `bunx` on Windows
  - Displays clear error message with actionable workarounds
  - Provides three recommended solutions: external server, local install, or source build
  - Includes confirmation message when using `--external-server` on Windows
- Comprehensive Windows troubleshooting documentation in README
- Windows-specific sections in API, SSE, and event documentation
- Test matrix for Windows scenarios (manual testing guide)
- PowerShell smoke test script for automated validation of Windows flows

### Fixed
- Enhanced error messages for Windows users when OpenCode Server fails to start
  - Added detection for `/bin/sh` and interpreter errors
  - Improved guidance for ENOENT and timeout errors
  - Added direct links to troubleshooting documentation

### Documentation
- New "Windows + bunx Limitation" section in README with detailed workarounds
- Updated "Platform Notes" to clearly indicate Windows `bunx` limitation
- Added Windows configuration notes to API endpoints documentation
- Added Windows-specific troubleshooting to SSE proxy documentation
- Added Windows error troubleshooting to SSE events documentation
- Created comprehensive Windows test matrix (`CONTEXT/WINDOWS-TEST-MATRIX.md`)
- Created automated smoke test script (`CONTEXT/WINDOWS-TEST-SMOKE.ps1`)
- Cross-linked to upstream issue tracking for Bun and OpenCode repositories

### Technical Details
- Implemented heuristic for detecting `bunx` temporary directory patterns on Windows
- Detection checks for: `bunx-<number>-` pattern, `.bunx` directory, and `Temp.*bunx` paths
- Exit code 1 when `bunx` detected without `--external-server` flag
- Preflight warning prevents misleading error messages and confusing stack traces

## Background

This release addresses a known limitation where `bunx opencode-web` on Windows cannot automatically launch the bundled OpenCode Server due to Bun's `/bin/sh` remapping issue. The changes ensure Windows users receive clear guidance and can successfully use opencode-web via alternative methods (external server or local install).

For technical details, see `CONTEXT/PLAN-windows-bunx-server-2025-11-03.md`.

## Migration Guide

### For Windows Users

**If you were using `bunx opencode-web@latest` on Windows:**

You now have three options:

1. **Use an external server** (recommended for `bunx`):
   ```powershell
   # Terminal 1: Start OpenCode Server
   opencode serve --hostname=127.0.0.1 --port=4096
   
   # Terminal 2: Run opencode-web
   bunx opencode-web@latest --external-server http://127.0.0.1:4096
   ```

2. **Install locally** (recommended for regular use):
   ```powershell
   bun install opencode-web
   # IMPORTANT: Run binary directly on Windows
   bun run packages/opencode-web/bin/opencode-web.js
   ```

3. **Build from source**:
   ```powershell
   git clone https://github.com/sst/opencode-web
   cd opencode-web
   bun install && bun run build
   bun run packages/opencode-web/bin/opencode-web.js
   ```

**macOS and Linux users:** No changes required. `bunx opencode-web@latest` continues to work as expected with automatic server launch.

**⚠️ Critical Windows Note**: When installing locally, you must run the binary directly (`bun run packages/opencode-web/bin/opencode-web.js`) rather than using the npm script (`bun run opencode-web`). The npm script may still encounter the same `/bin/sh` limitation.

---

**Note:** This changelog will be updated with version numbers upon release.
