## Windows Rollup Build Recovery Plan

### Context & Decisions
- Windows builds fail because Rollup and Tailwind CSS cannot find their Windows native binaries when lockfiles authored on Linux omit platform-specific optional dependencies (`package.json`, `package-lock.json`, `bun.lock`).
- Bun follows the recorded dependencies exactly, so Windows machines inherit Linux lockfiles that skip Win32 binaries, triggering runtime errors like:
  - `Cannot find module '@rollup/rollup-win32-x64-msvc'`
  - `Cannot find native binding` from `@tailwindcss/oxide`
- Root-cause aligns with npm optional-dependency bug (npm/cli#4828); mitigation is to explicitly list the necessary Windows binaries as `optionalDependencies` so every lockfile includes them regardless of author platform.
- Scope limited to 64-bit Windows targets: **skip 32-bit packages** per latest direction; cover both Rollup and Tailwind CSS Windows binaries.

### Technical Specifications
| Area | Details |
| --- | --- |
| Build tool wrapper | `script/vite-build.ts` spawns `vite build` and streams filtered logs (no change required). |
| Package metadata | Updates confined to root `package.json` `optionalDependencies` block; add Rollup and Tailwind CSS Win64 binaries and retain Lightning CSS entries. |
| Lockfiles | Regenerate `bun.lock` (Bun preferred) and `package-lock.json` (npm compatibility) after dependency edits. |
| Config | `.gitignore` already ignores `bun.lock` but repository stores it—ensure regenerated file is committed despite ignore entry (git add explicit path). |
| External bug reference | npm optional dependency bug https://github.com/npm/cli/issues/4828 explains rationale for explicit pinning. |
| Platforms | Windows 10/11 x64 + Windows on ARM64 (Surface, etc.). |

### Code References
- `package.json`
- `package-lock.json`
- `bun.lock`
- `script/vite-build.ts`
- `.gitignore`

### External References
- `https://github.com/npm/cli/issues/4828` (root cause explanation, for PR context)
- `https://github.com/rollup/rollup` (source of platform-specific artifacts if deeper inspection is needed)

### Actionable Task Breakdown
#### 1. Capture Current State
- [x] Note current Rollup version resolved via `package-lock.json` (`@rollup/rollup` at 4.52.5) and confirm no direct dependency overrides.
- [x] Verify Lightning CSS optional dependencies stay unchanged (ensure no regressions when editing block).

#### 2. Update `package.json`
- [x] Add `"@rollup/rollup-win32-x64-msvc": "4.52.5"` under `optionalDependencies`.
- [x] Add `"@rollup/rollup-win32-arm64-msvc": "4.52.5"` under `optionalDependencies`.
- [x] Ensure 32-bit packages are **not** added (per requirement).

#### 3. Refresh Lockfiles
- [x] Delete existing `bun.lock` and `node_modules` (optional but recommended before regen) or run `bun install --force` to refresh artifacts.
- [x] Run `bun install` to update `bun.lock` with new optional deps.
- [x] Run `npm install --package-lock-only` (or `npm install`) to regenerate `package-lock.json` so CI/npm consumers stay in sync.
- [x] Manually `git add bun.lock package-lock.json` because `.gitignore` lists `bun.lock`.

#### 4. Document Troubleshooting Guidance
- [x] Update `README.md` (or relevant docs) with short Windows recovery note instructing devs to clear `node_modules` and reinstall if they still hit the error.
- [x] Mention link to npm issue for historical context.

#### 5. Validate Locally
- [x] Run `bun run build` on Linux/macOS to ensure no regression.
- [ ] Have a Windows environment (or CI job) reinstall fresh (`rm -r node_modules && bun install`) and run `bun run build` to confirm Rollup loads the platform binary successfully.

#### 6. Prepare PR / Communication
- [x] Summarize change rationale (optional deps bug) in PR body referencing npm issue.
- [x] Highlight Windows-only impact and note that 32-bit binaries are intentionally omitted.

### Implementation Order & Milestones
1. **State Capture** – gather version data & confirm scope (Task 1).
2. **Dependency Edit** – update `package.json` optional deps (Task 2).
3. **Lockfile Sync** – regenerate Bun + npm lockfiles (Task 3).
4. **Docs Update** – add troubleshooting note (Task 4).
5. **Validation** – local + Windows build verification (Task 5).
6. **PR Prep** – finalize communication + commit (Task 6).

Milestone checkpoints:
- *M1*: Optional dependencies updated and committed (Tasks 1-3 complete).
- *M2*: Documentation + validation done (Tasks 4-5 complete).
- *M3*: PR ready with verification notes (Task 6 complete).

### Validation Criteria
- `package.json` shows both Rollup and Tailwind CSS Win64 packages under `optionalDependencies` with correct versions and no 32-bit entries.
- `bun.lock` and `package-lock.json` each contain `@rollup/rollup-win32-x64-msvc`, `@rollup/rollup-win32-arm64-msvc`, `@tailwindcss/oxide-win32-x64-msvc`, and `@tailwindcss/oxide-win32-arm64-msvc` entries.
- `bun run build` succeeds on Linux/macOS (baseline) **and** Windows machines after a clean reinstall.
- Windows build logs no longer throw `Cannot find module '@rollup/rollup-win32-x64-msvc'` or `Cannot find native binding` errors.
- Documentation includes user-facing remediation steps for both Rollup and Tailwind CSS, reducing future support churn.
- PR description references npm/cli#4828 and explains why explicit optional deps are necessary.

### Additional Notes
**Scope Expansion**: During implementation, discovered that Tailwind CSS also suffers from the same npm optional dependency bug. Added `@tailwindcss/oxide-win32-x64-msvc` and `@tailwindcss/oxide-win32-arm64-msvc` to prevent `Cannot find native binding` errors on Windows. This extends the fix beyond just Rollup to cover the complete build toolchain.
