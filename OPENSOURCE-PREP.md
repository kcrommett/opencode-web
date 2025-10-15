# Open Source Launch Prep Plan

This document tracks every task we should complete before publishing the project publicly. Items are grouped by theme and include the specific files/locations that need attention, proposed remediation, and verification steps. Treat the checklist as sequential unless otherwise noted.

---

## 0. Align with OpenCode Standards

- [ ] **Adopt Bun-first toolchain metadata**  
  - Files: `package.json`, `bun.lock`, `bunfig.toml`  
  - Issue: Current docs/scripts lean on generic npm flows, while the upstream `opencode` repo standardizes on Bun 1.3.x with exact installs.  
  - Remedy: Declare `"packageManager": "bun@1.3.x"` in `package.json`, add `bunfig.toml` with `exact = true`, and ensure scripts reference `bun run …`. Replace README/dev docs with Bun-centric install commands.  
  - Verify: Fresh clone → `bun install` succeeds without warnings; `bun --version` matches metadata; lockfile diff stays empty.

- [ ] **Mirror agent/developer docs**  
  - Files: `AGENTS.md` (new), `README.md`  
  - Task: Provide quick-start commands that mirror `packages/opencode/AGENTS.md` (install, dev, lint/typecheck/test). Highlight shared expectations (prefer Bun APIs, avoid `any`, etc.).  
  - Verify: A contributor following AGENTS.md can run `bun run dev`, `bun run lint`, `bun run typecheck` end-to-end.

- [ ] **Match repository formatting defaults**  
  - Files: `package.json`, `.prettierrc` (new or existing)  
  - Issue: Upstream uses Prettier with `semi: false`, `printWidth: 120`. Divergent defaults will cause noisy diffs when syncing code.  
  - Remedy: Adopt the same Prettier config and document it in README/AGENTS. Run formatter once to baseline the tree.  
  - Verify: `bun x prettier --check .` succeeds; linting shows no formatting complaints.

## 1. Security Hardening

- [ ] **Fix static asset path traversal**  
  - File: `server.ts:30-82`  
  - Issue: Joining `CLIENT_DIRECTORY` with the raw request path allows `../` traversal and exposure of arbitrary files.  
  - Remedy: Resolve to `path.resolve(CLIENT_DIRECTORY, '.' + pathname)` (or similar), ensure the resolved path starts with the canonical `CLIENT_DIRECTORY`, and reject anything outside the tree.  
  - Verify:  
    1. Add unit/integration test covering `/public/../../.env` request.  
    2. Manually curl suspicious paths; expect `403` or `404`.  
    3. Re-run the dev/prod server smoke tests.

- [ ] **Purge private infrastructure references**  
  - Files: `.env.local`, `.env.example`, `vite.config.ts:17`, `README.md` sections mentioning `code.shuv.dev` / `assets.shuv.dev`.  
  - Issue: Hard-coded personal domains leak internal infrastructure.  
  - Remedy: Replace with placeholders (`YOUR_DOMAIN`), document configuration in README, and ensure `.env.local` stays untracked.  
  - Verify: Search repo for `shuv.dev` or other personal domains → zero results.

- [ ] **Audit server-to-server calls**  
  - Files: `src/lib/opencode-http-api.ts`, `src/lib/opencode-client.ts`.  
  - Task: Confirm we never surface backend error bodies that might include sensitive stack traces. Wrap fetch errors with friendly messages while logging details server-side only.  
  - Verify: Trigger representative 4xx/5xx responses and ensure the client surfaces sanitized errors.

- [ ] **Review logging for sensitive data**  
  - Files: `src/hooks/useOpenCode.ts` (extensive `console.log`s), `src/lib/opencode-events.ts`.  
  - Task: Gate noisy logs behind a `NODE_ENV !== 'production'` or dedicated debug flag. Ensure we do not log model keys, file contents, or shell output by default.  
  - Verify: Build production bundle and confirm logs are stripped or disabled.

---

## 2. Build & Type Safety

- [ ] **Resolve broken TypeScript imports**  
  - Files: `src/app/_components/message/*.tsx`.  
  - Issue: Importing `Part` via `../../../../node_modules/@opencode-ai/sdk/...` breaks `tsc`.  
  - Options:  
    1. Create a local `src/types/opencode.ts` describing the subset of `Part` fields we rely on.  
    2. Or declare `@opencode-ai/sdk` as a dependency and import from its public API.  
  - Verify: `bun x tsc --noEmit` passes.

- [ ] **Decide fate of orphan `index.ts` (backend helper)**  
  - File: `index.ts` at repo root.  
  - Issue: References non-existent modules (`../bus`, `../util/log`, `./ripgrep`, etc.).  
  - Remedy:  
    - If required by another project, move it out of this repo.  
    - Otherwise delete and remove unused dependencies.  
  - Verify: Re-run `git grep "File."` to ensure no references remain; `bun x tsc --noEmit` clean.

- [ ] **Standardize TypeScript project references**  
  - Task: Ensure `tsconfig.json` `include` excludes generated folders (`dist`, `dev-dist`).  
  - Verify: `bun run lint` and `bun x tsc --noEmit` succeed on a clean install.

---

## 3. Dependency & Package Hygiene

- [ ] **Rationalize lockfiles**  
  - Files: `bun.lock`, `package-lock.json`, `pnpm-lock.yaml`.  
  - Task: Standardize on Bun (matching `opencode`) and delete other lockfiles. Ensure docs call out Bun-only support.  
  - Verify: Run `git status` → no residual lockfiles; `bun install` after deletion reproduces identical `bun.lock`.

- [ ] **Audit transitive dependencies**  
  - Task: Run `bun x npm audit --omit=dev` (or equivalent) and patch/blockers before release.  
  - Verify: No high/critical advisories remain.

- [ ] **Ensure production dependencies are minimal**  
  - Task: After resolving `index.ts`, remove unused packages (e.g., `ignore`, `fuzzysort`, `diff`, etc. if no longer needed).  
  - Verify: `bun pm ls --production` (or `bunx npm ls --production`) shows only required packages; bundle size unchanged or reduced.

---

## 4. Application UX & Configuration

- [ ] **Finish onboarding modal**  
  - File: `src/app/index.tsx:2260-2287`.  
  - Issue: Input change handler still `// TODO`.  
  - Remedy: Persist URL to localStorage and propagate into context that configures `VITE_OPENCODE_SERVER_URL` proxy.  
  - Verify: Fresh user can connect by entering server URL without editing env files.

- [ ] **Configure dev server allowed hosts**  
  - File: `vite.config.ts:14-21`.  
  - Issue: Hard-coded allowed host (`code.shuv.dev`) blocks other contributors.  
  - Remedy: Accept env-driven allow list or default to unrestricted in development.  
  - Verify: Another machine on LAN can access dev server using their hostname.

- [ ] **Document environment configuration**  
  - Files: `README.md`, new `docs/CONFIGURATION.md`.  
  - Task: Detail each env var, recommended defaults for local vs. production, and example `.env`.  
  - Verify: Ask a teammate to follow docs from scratch; collect feedback.

---

## 5. Documentation & Community Readiness

- [ ] **Create OSS meta files**  
  - Add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, PR template, issue templates.  
  - Verify: Links in README point to the new docs and mirror tone of `opencode` equivalents.

- [ ] **Polish README**  
  - Ensure Quick Start references Bun commands, includes screenshots/gifs, and clarifies that the backend must remain private.  
  - Add section covering security model and limitations (e.g., no auth), referencing upstream docs (`https://opencode.ai/docs`) where helpful.  
  - Verify: Run Markdown lint (optional) and request peer review.

- [ ] **Add CHANGELOG**  
  - Document initial public release as `v0.1.0` (or similar).  
  - Verify: Changelog entries align with git tags.

---

## 6. Testing & Release Automation

- [ ] **Set up lint/type/test scripts for CI**  
  - Scripts: `"lint": "eslint"`, `"typecheck": "tsc --noEmit"` (run via Bun), optional `"test": "vitest"` if tests exist.  
  - Configure GitHub Actions to reuse `./opencode/.github/actions/setup-bun`, then run `bun run lint`, `bun x tsc --noEmit`, and any tests on PRs.  
  - Verify: CI badge in README and successful run on main branch.

- [ ] **Smoke-test PWA build**  
  - Commands: `bun run build`, start preview server, confirm manifest/assets load without relying on `assets.shuv.dev`.  
  - Verify: Lighthouse PWA audit passes; static assets served from repository.

- [ ] **Release checklist**  
  1. Start from clean clone.  
  2. Install dependencies with `bun install`.  
  3. Run `bun run lint`, `bun x tsc --noEmit`, `bun run build`.  
  4. Execute manual QA: message flow, file viewer (text/image), SSE events, shell commands.  
  5. Tag release (`git tag vX.Y.Z`), generate release notes from CHANGELOG.  
  6. Publish package/site; if hosting static build, confirm deployment path.

---

## 7. Post-Launch Monitoring

- [ ] Decide on issue triage process (labels, response SLA).  
- [ ] Set up dependabot/renovate for dependency updates.  
- [ ] Draft roadmap tickets for stretch goals (auth, multi-user support, etc.).

---

### Progress Tracking

Maintain this file through completion. When an item is complete, replace `[ ]` with `[x]` and capture the PR/commit reference for traceability.
