# Plan: Setup Binary Release Pipeline with Release Please and GoReleaser

**Issue**: [#150 - Setup Binary Release Pipeline with Release Please and GoReleaser](https://github.com/kcrommett/oc-web/issues/150)  
**Created**: 2025-11-25  
**Status**: Planning  

---

## Overview

This plan documents the implementation of an automated release pipeline for `opencode-web` that:

1. Uses **Release Please** to automate semantic versioning, CHANGELOG generation, and release PR creation
2. Uses **GoReleaser** (v2.6+) with the Bun builder to compile standalone binaries
3. Builds and uploads binaries for multiple platforms to GitHub Releases

### Current State

- Manual `workflow_dispatch` release process in `.github/workflows/release.yml`
- NPM package publishing via `script/build-npm.ts` and `script/publish-npm.ts`
- Current version: `1.1.4` (from `package.json`)
- Bun-based TanStack Start application with server entry at `server.ts`

### Target State

- Automated release PRs created on push to `master` via Release Please
- On release PR merge, GoReleaser builds standalone binaries for:
  - `linux-x64`
  - `darwin-x64` (macOS Intel)
  - `darwin-arm64` (macOS Apple Silicon)
- Binaries uploaded to GitHub Releases automatically
- NPM publishing integrated into the same workflow

---

## Technical Decisions & Rationale

### Why Release Please?

- **Conventional Commits**: Automatically determines version bumps from commit messages (`fix:` = patch, `feat:` = minor, `feat!:` = major)
- **CHANGELOG Generation**: Maintains human-readable changelog from commits
- **GitHub Native**: Creates release PRs that can be reviewed before merging
- **Manifest Support**: Single config for monorepo-style projects

### Why GoReleaser with Bun Builder?

- **Native Bun Support**: GoReleaser v2.6+ includes `builder: bun` for compiling TypeScript to standalone executables
- **Cross-Platform**: Builds for multiple targets in a single run
- **GitHub Integration**: Native support for uploading artifacts to GitHub Releases
- **No Extra CI Complexity**: Single tool handles build + archive + upload

### Version Source of Truth

- Release Please will manage version in `.release-please-manifest.json`
- The `package.json` version will be updated by Release Please as an "extra file"
- GoReleaser reads version from git tags created by Release Please

---

## Implementation Tasks

### Phase 1: Release Please Configuration

#### 1.1 Create Release Please Config File

- [ ] Create `release-please-config.json` in repository root

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "packages": {
    ".": {
      "release-type": "node",
      "package-name": "opencode-web",
      "changelog-path": "CHANGELOG.md",
      "include-v-in-tag": true,
      "bump-minor-pre-major": false,
      "bump-patch-for-minor-pre-major": false
    }
  }
}
```

**File Reference**: Create new file at `./release-please-config.json`

#### 1.2 Create Release Please Manifest

- [ ] Create `.release-please-manifest.json` with current version

```json
{
  ".": "1.1.4"
}
```

**File Reference**: Create new file at `./.release-please-manifest.json`

**Note**: The version `1.1.4` is taken from the current `package.json:2`. This must match the latest released version.

#### 1.3 Verify CHANGELOG.md Format

- [ ] Review existing `CHANGELOG.md` format compatibility
- [ ] Ensure format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) convention (already compliant per `CHANGELOG.md:5-6`)

**File Reference**: `./CHANGELOG.md`

---

### Phase 2: GoReleaser Configuration

#### 2.1 Create GoReleaser Configuration

- [ ] Create `.goreleaser.yaml` with Bun builder configuration

```yaml
# yaml-language-server: $schema=https://goreleaser.com/static/schema.json
version: 2

project_name: opencode-web

before:
  hooks:
    # Install dependencies before building
    - bun install
    # Build the web application (creates dist/ directory)
    - bun run build

builds:
  - id: opencode-web
    builder: bun
    binary: opencode-web
    # Main entry point for bun build --compile
    main: ./server.ts
    # Targets supported by bun build --compile
    # See: https://bun.sh/docs/bundler/executables
    targets:
      - linux-x64-modern
      - darwin-x64
      - darwin-arm64
    env:
      - NODE_ENV=production
    # GoReleaser runs from repo root
    dir: .

archives:
  - id: default
    format: tar.gz
    # Archive naming template
    name_template: >-
      {{ .ProjectName }}_
      {{- .Version }}_
      {{- .Os }}_
      {{- if eq .Arch "amd64" }}x86_64
      {{- else if eq .Arch "arm64" }}arm64
      {{- else }}{{ .Arch }}{{ end }}
    # Include additional files in archive
    files:
      - README.md
      - LICENSE
      - CHANGELOG.md

checksum:
  name_template: 'checksums.txt'
  algorithm: sha256

release:
  github:
    owner: '{{ .Env.GITHUB_REPOSITORY_OWNER }}'
    name: '{{ envOrDefault "GITHUB_REPOSITORY_NAME" "oc-web" }}'
  # Release Please creates the release, GoReleaser adds artifacts
  mode: append
  # Handle prereleases based on version
  prerelease: auto
  # Release name template
  name_template: "v{{ .Version }}"

changelog:
  # Release Please manages the changelog, skip GoReleaser's
  disable: true
```

**File Reference**: Create new file at `./.goreleaser.yaml`

#### 2.2 Validate GoReleaser Bun Builder Requirements

- [ ] Confirm entry point works with `bun build --compile ./server.ts`
- [ ] Verify `dist/` directory is properly bundled or referenced
- [ ] Test that compiled binary can locate/serve static assets

**File References**:
- `./server.ts` - Main server entry point
- `./dist/client/` - Built client assets (after `bun run build`)
- `./dist/server/` - Built server assets

**Potential Issue**: The current `server.ts:33-38` references paths relative to `process.cwd()`:
```typescript
const CLIENT_DIRECTORY = path.resolve(process.cwd(), "dist/client");
const SERVER_ASSETS_DIRECTORY = path.resolve(process.cwd(), "dist/server");
const SERVER_ENTRY_POINT = new URL("./dist/server/server.js", import.meta.url);
```

This may need adjustment for standalone binary execution. Options:
1. Bundle assets into the binary (increases size significantly)
2. Expect assets in a known location relative to binary
3. Use `import.meta.dir` for Bun-specific resolution

---

### Phase 3: GitHub Actions Workflow

#### 3.1 Update Release Workflow

- [ ] Replace existing `.github/workflows/release.yml` with new automated workflow

```yaml
name: Release

on:
  push:
    branches:
      - master

permissions:
  contents: write
  pull-requests: write

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false

jobs:
  release-please:
    name: Release Please
    runs-on: ubuntu-latest
    outputs:
      release_created: ${{ steps.release.outputs.release_created }}
      tag_name: ${{ steps.release.outputs.tag_name }}
      version: ${{ steps.release.outputs.version }}
      upload_url: ${{ steps.release.outputs.upload_url }}
    steps:
      - name: Run Release Please
        uses: googleapis/release-please-action@v4
        id: release
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json

  build-binaries:
    name: Build Binaries
    needs: release-please
    if: ${{ needs.release-please.outputs.release_created == 'true' }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run GoReleaser
        uses: goreleaser/goreleaser-action@v6
        with:
          distribution: goreleaser
          version: "~> v2"
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY_OWNER: ${{ github.repository_owner }}
          GITHUB_REPOSITORY_NAME: ${{ github.event.repository.name }}

  publish-npm:
    name: Publish to NPM
    needs: release-please
    if: ${{ needs.release-please.outputs.release_created == 'true' }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Generate route tree
        run: bun x @tanstack/router-cli generate

      - name: Build NPM package
        env:
          OPENCODE_CHANNEL: latest
        run: bun ./script/build-npm.ts --skip-bump

      - name: Publish to NPM
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: bun ./script/publish-npm.ts
```

**File Reference**: `./github/workflows/release.yml` (replace existing)

#### 3.2 Preserve CI Workflow

- [ ] Ensure `.github/workflows/ci.yml` continues to run on PRs
- [ ] No changes needed to CI workflow

**File Reference**: `./.github/workflows/ci.yml:1-38` (no changes)

---

### Phase 4: Build Script Modifications

#### 4.1 Modify build-npm.ts for Version Handling

- [ ] Add `--skip-bump` flag support to use Release Please's version
- [ ] Ensure script reads version from `package.json` when `OPENCODE_BUMP` is not set

**File Reference**: `./script/build-npm.ts:21-32`

Current behavior already supports this:
```typescript
const TARGET_VERSION = bump
  ? bumpVersion(currentPkg.version, bump)
  : currentPkg.version;
```

No changes needed if `OPENCODE_BUMP` env var is not set.

#### 4.2 Asset Bundling Investigation

- [ ] Determine if `dist/` assets need to be embedded in binary
- [ ] Test binary execution from different working directories
- [ ] Document asset location requirements

**Considerations**:
- Bun's `--compile` creates a single executable
- Static assets in `dist/client/` and `dist/server/` may need special handling
- Options: embed via Bun's asset system, or distribute alongside binary in archive

---

### Phase 5: Testing & Validation

#### 5.1 Local Testing

- [ ] Test Release Please config with `npx release-please release-pr --dry-run`
- [ ] Test GoReleaser with `goreleaser build --snapshot --clean`
- [ ] Verify binary runs correctly on local machine

**Commands**:
```bash
# Test Release Please (requires GITHUB_TOKEN)
npx release-please release-pr \
  --repo-url=kcrommett/oc-web \
  --token=$GITHUB_TOKEN \
  --dry-run

# Test GoReleaser locally
goreleaser build --snapshot --clean

# Test resulting binary
./dist/opencode-web_linux_amd64_v1/opencode-web
```

#### 5.2 CI Testing

- [ ] Create test branch and push conventional commit
- [ ] Verify Release Please creates PR
- [ ] Merge PR and verify GoReleaser runs
- [ ] Download and test binaries from release

#### 5.3 Validation Criteria

| Step | Validation |
|------|------------|
| Release Please Config | PR created with correct version bump |
| GoReleaser Config | Binaries built for all 3 targets |
| Binary Execution | `./opencode-web` starts server successfully |
| Static Assets | Web UI loads in browser |
| NPM Publish | Package available on npmjs.com |
| GitHub Release | All artifacts attached to release |

---

## External References

### Documentation

| Resource | URL |
|----------|-----|
| GoReleaser Bun Builder | https://goreleaser.com/customization/builds/bun/ |
| Release Please Action | https://github.com/googleapis/release-please-action |
| Release Please Manifest | https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md |
| Bun Compile Docs | https://bun.sh/docs/bundler/executables |
| Conventional Commits | https://www.conventionalcommits.org/en/v1.0.0/ |

### Code References (External)

| Repository | Purpose |
|------------|---------|
| https://github.com/googleapis/release-please | Release Please core library |
| https://github.com/googleapis/release-please-action | GitHub Action for Release Please |
| https://github.com/goreleaser/goreleaser | GoReleaser core tool |
| https://github.com/goreleaser/goreleaser-action | GitHub Action for GoReleaser |

---

## Internal File References

| File | Purpose |
|------|---------|
| `.github/workflows/release.yml` | Current release workflow (to be replaced) |
| `.github/workflows/ci.yml` | CI workflow (unchanged) |
| `.github/actions/setup-bun/action.yml` | Bun setup composite action |
| `package.json` | Project metadata and version |
| `CHANGELOG.md` | Existing changelog |
| `server.ts` | Main server entry point |
| `script/build-npm.ts` | NPM package build script |
| `script/publish-npm.ts` | NPM publish script |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Binary cannot find `dist/` assets | Medium | High | Test thoroughly; may need to bundle assets or document deployment |
| GoReleaser Bun builder incompatibility | Low | High | Feature is stable since v2.6; test with snapshot builds |
| Release Please version mismatch | Low | Medium | Manifest tracks version; test with dry-run |
| NPM publish timing | Low | Low | Run in parallel with binary build |

---

## Implementation Order

```
Phase 1: Release Please Configuration
  |
  v
Phase 2: GoReleaser Configuration
  |
  v
Phase 3: GitHub Actions Workflow
  |
  v
Phase 4: Build Script Modifications (if needed)
  |
  v
Phase 5: Testing & Validation
```

### Milestones

1. **M1**: Release Please creates valid release PR (Phases 1, 3.1)
2. **M2**: GoReleaser builds working binaries locally (Phase 2)
3. **M3**: Full pipeline works end-to-end on test branch (Phases 3, 5)
4. **M4**: Production release on `master` branch

---

## Open Questions

1. **Asset Distribution**: Should binaries include embedded assets, or should users download a tarball with binary + assets?
   - **Recommendation**: Start with tarball approach (binary + dist/ in archive). Embedding can be explored later.

2. **Windows Support**: Issue mentions `linux-x64`, `darwin-x64`, `darwin-arm64`. Should Windows be included?
   - **Note**: `CHANGELOG.md:33-66` documents Windows `bunx` limitations. May want to add `windows-x64` target if Bun compile supports it.

3. **Branch Name**: Issue says `master`, but repo may use `main`. Verify before implementation.
   - **Action**: Check default branch name in GitHub settings.

4. **Prerelease Strategy**: Should alpha/beta releases be supported?
   - **Recommendation**: Start without; can add `prerelease-type` config later.

---

## Appendix: Sample Conventional Commits

```bash
# Patch release (bug fix)
git commit -m "fix: resolve SSE proxy connection timeout"

# Minor release (new feature)
git commit -m "feat: add dark mode toggle to settings"

# Major release (breaking change)
git commit -m "feat!: restructure configuration file format

BREAKING CHANGE: The config file format has changed from X to Y."

# No release (chore)
git commit -m "chore: update dependencies"
git commit -m "docs: improve README installation section"
git commit -m "ci: add caching to workflow"
```
