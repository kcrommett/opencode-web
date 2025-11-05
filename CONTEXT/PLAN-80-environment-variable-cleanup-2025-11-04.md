## Issue Overview
- **Source**: [#80 · Clean up and unify environment variables, CLI flags and runtime configuration](https://github.com/kcrommett/opencode-web/issues/80)
- **Problem**: Configuration relies on a mix of CLI flags (`--port`, `--host`, `--external-server`, `--no-bundled-server`), environment variables (`PORT`, `HOST`, `OPENCODE_SERVER_URL`, etc.), and runtime globals, leading to unclear precedence and duplicated naming.
- **Goal**: Collapse the configuration surface to exactly three canonical variables (`OPENCODE_SERVER_URL`, `OPENCODE_WEB_HOST`, `OPENCODE_WEB_PORT`), maintain backward compatibility during transition, and refresh all related docs/tooling.
- **Conversation Notes**: This plan must be saved under `CONTEXT/` with the prescribed naming scheme and cover actionable steps, validation, references, and rationale so future contributors do not need to re-derive context.

## Context & Decisions
### Current Pain Points
1. Multiple env variables and CLI flags map to the same concern (server URL, host, port) without a single source of truth (`server.ts:8-225`, `packages/opencode-web/bin/opencode-web.js:18-626`).
2. Runtime URL resolution spans build-time vars, SSR globals, and browser-injected config (`src/lib/opencode-config.ts:1-51`).
3. Documentation describes outdated precedence and variable names (`README.md:67-200`, `.env.example`).
4. Bundled OpenCode server bootstrapping relies on legacy env names (`OPENCODE_SERVER_PORT`, `OPENCODE_SERVER_HOSTNAME`) and differs between platforms (`packages/opencode-web/bin/opencode-web.js:248-575`).
5. SSE proxy and Vite dev server read from the old env set, so behavior diverges between `bun run dev`, `bun run start`, and the packaged CLI (`server.ts`, `packages/opencode-web/server.ts`, `vite.config.ts`).

### Guiding Decisions
- **Three core variables**: `OPENCODE_SERVER_URL`, `OPENCODE_WEB_HOST`, `OPENCODE_WEB_PORT` (issue requirement).
- **Backward compatibility**: Continue honoring legacy names/flags with clear warnings until the ecosystem migrates.
- **Single resolver**: Centralize precedence logic inside `src/lib/opencode-config.ts` (and reuse in package builds) so Vite, Bun server, and CLI stay aligned.
- **Explicit precedence**: Document and enforce CLI flag → env var → defaults ordering uniformly across dev/prod.
- **Docs first-class**: README, `.env.example`, and release notes must describe the simplified surface; include migration guidance.
- **Testing**: Cover CLI, env-only, and default flows in both dev (`bun run dev`) and prod (`bun run start`, packaged CLI) modes.

### Constraints & Considerations
- Bundled server auto-start must keep working on macOS/Linux and emit Windows Workarounds when unavailable.
- CLI runs under Bun and may execute before repo build output exists, so config resolution cannot assume TypeScript helpers; expose compiled JS equivalents for the package.
- Env lookups must never leak secrets in logs; warn only when falling back to defaults.
- Avoid breaking existing automation that sets `PORT`/`HOST` (common PaaS conventions) even as `OPENCODE_WEB_*` becomes canonical.

## Current State Snapshot
| Concern | Today | Reference |
| --- | --- | --- |
| CLI flags | `--port`, `--host`, `--external-server`, `--no-bundled-server`, plus hidden `-s` alias | `packages/opencode-web/bin/opencode-web.js:18-120`
| Env precedence | `OPENCODE_SERVER_URL` → `VITE_OPENCODE_SERVER_URL` → SSR global → default `http://localhost:4096` | `src/lib/opencode-config.ts:9-51`
| Bun server binding | Uses `PORT`/`HOST` only; logs `0.0.0.0` special case | `server.ts:22-226`, `packages/opencode-web/server.ts:55-275`
| Bundled OpenCode server opts | `OPENCODE_SERVER_PORT`, `OPENCODE_SERVER_HOSTNAME`, `OPENCODE_WEB_DISABLE_BUNDLED_SERVER` | `packages/opencode-web/bin/opencode-web.js:214-508`
| Dev server proxy | `vite.config.ts` loads `.env` and mirrors values into `process.env` before calling helpers | `vite.config.ts:1-75`
| Documentation | README + `.env.example` mention legacy vars and precedence | `README.md:67-200`, `.env.example`

## Technical Specifications
### Core Configuration Surface
| Name | Type | Default | Consumers | Notes |
| --- | --- | --- | --- | --- |
| `OPENCODE_SERVER_URL` | string (URL) | `http://localhost:4096` | Browser config payload, SSE proxy, CLI bundled server passthrough, Vite proxy | Must be full URL (scheme + host + port). Validation lives in `src/lib/opencode-config.ts`.
| `OPENCODE_WEB_HOST` | string (hostname/IP) | `localhost` (CLI) / `127.0.0.1` (back-compat) | Bun production server(s), Vite dev server, CLI logging | Accepts `0.0.0.0` for LAN; map CLI `--host`.
| `OPENCODE_WEB_PORT` | number | `3000` | Bun production server(s), Vite dev server, CLI | Accepts strings; parse to int; fallback to `PORT` env for PaaS compatibility.

### CLI Flag Mapping
| CLI flag | Target env | Notes |
| --- | --- | --- |
| `--port`, `-p` | `OPENCODE_WEB_PORT` (and `PORT` for back-compat) | Normalize to integer; warn if conflicting env.
| `--host`, `-H` | `OPENCODE_WEB_HOST` (and `HOST`) | Mirror value into legacy `HOST` for old scripts.
| `--external-server`, `-s` | `OPENCODE_SERVER_URL` | Should also set legacy `VITE_OPENCODE_SERVER_URL` so existing client-side code compiles.
| `--no-bundled-server` | `OPENCODE_WEB_DISABLE_BUNDLED_SERVER=1` | Keep alias but document canonical env.

### Backward Compatibility Layer
1. Introduce a `resolveConfig()` helper returning `{ webHost, webPort, serverUrl, flags: { fromLegacy: boolean } }`.
2. Legacy vars (`PORT`, `HOST`, `VITE_OPENCODE_SERVER_URL`, `OPENCODE_SERVER_PORT`, `OPENCODE_SERVER_HOSTNAME`, `OPENCODE_WEB_DISABLE_BUNDLED_SERVER`) map into canonical names inside this helper with warnings like `console.warn('[deprecate] PORT is deprecated, prefer OPENCODE_WEB_PORT')` gated to dev/non-test modes.
3. Keep SSR global (`globalThis.__OPENCODE_SERVER_URL__`) injection for hydration, but have it sourced from the canonical value only.

```ts
const { webHost, webPort, serverUrl } = resolveConfig({
  env: process.env,
  cliOverrides: cliOptions,
});
```

### Config Resolution Order
1. CLI flags (`opencode-web` bin) override everything else for the running process.
2. Canonical env vars (`OPENCODE_*`) loaded from `.env*` or host environment.
3. Legacy env vars (e.g., `PORT`, `HOST`) as fallback, emitting warnings where feasible.
4. Hard-coded defaults.

### Integration Points
- **Bun production servers**: `server.ts` and `packages/opencode-web/server.ts` should import the same compiled helper (ship JS build under `packages/opencode-web/dist/config.js`).
- **Vite dev server**: `vite.config.ts` should call the helper (or at minimum respect the canonical env names when configuring `server.port` and proxy target).
- **CLI + bundled server**: `packages/opencode-web/bin/opencode-web.js` must set canonical env vars before spawning bundled OpenCode server or copying `dist/`.
- **Front-end hydration**: `src/app/__root.tsx` (via start config) should receive `OPENCODE_SERVER_URL` once and reuse it across components.
- **Docs & samples**: `.env.example`, README sections (Quick Start, Env Vars, Getting Started, Production) must describe only the three core vars and note legacy compatibility.

### Documentation & Messaging
- Add a "Migration" subsection explaining old → new variable mapping.
- Mention Windows `bunx` limitation still applies but reference the new env names when instructing external server usage.
- Update issue changelog entry in `CHANGELOG.md` once implementation lands.

## Internal Code References
| Path | Purpose |
| --- | --- |
| `server.ts:8-226` | Bun production entry, handles CLI args, SSE proxy, `PORT`/`HOST` usage.
| `packages/opencode-web/server.ts:6-276` | Packaged server entry (JS) mirroring root logic; must stay in sync.
| `packages/opencode-web/bin/opencode-web.js:18-626` | CLI surface that parses flags, sets env, and manages bundled OpenCode server lifecycle.
| `src/lib/opencode-config.ts:1-51` | Current URL resolver and normalization helper.
| `vite.config.ts:1-75` | Dev server, proxy, and `.env` loading.
| `.env.example` | Sample configuration file listing outdated variables.
| `README.md:67-200` | User-facing CLI and environment documentation.
| `packages/opencode-web/package.json` & root `package.json` | Scripts (`bun run dev`, `bun run start`, package bin entry).

## External Code References
- Next.js custom server env resolution (schema for host/port defaults): `https://github.com/vercel/next.js/blob/canary/examples/custom-server-express/server.js`
- Docker + Node service env mapping example (compose for host/port variables): `https://github.com/docker/awesome-compose/blob/master/nginx-nodejs/docker-compose.yaml`

## Action Plan & Task Breakdown
### Phase 1 – Config Helper & Types
- [ ] Define `resolveWebConfig` + `normalizeServerUrl` utilities in `src/lib/opencode-config.ts`, exporting both TypeScript and build-friendly JS.
- [ ] Capture metadata (source of each value) for logging and potential telemetry.
- [ ] Add unit tests (e.g., `src/lib/opencode-config.test.ts`) covering precedence, invalid URLs, and warning emissions.

### Phase 2 – Bun Server Integration
- [ ] Update `server.ts` to consume the new helper, replacing direct `process.env.PORT/HOST` reads.
- [ ] Mirror the same changes into `packages/opencode-web/server.ts` (compiled output) or refactor to import shared helper from the package bundle.
- [ ] Ensure SSE proxy warnings reference `OPENCODE_SERVER_URL` only.

### Phase 3 – CLI Surface Alignment
- [ ] Refactor `packages/opencode-web/bin/opencode-web.js` to set canonical env vars (`OPENCODE_WEB_PORT/HOST`, `OPENCODE_SERVER_URL`) before any downstream imports.
- [ ] Map legacy flags/environment variables into canonical values with deprecation warnings and telemetry counters.
- [ ] Ensure bundled OpenCode server options read from canonical names while still honoring `OPENCODE_SERVER_PORT/HOSTNAME` for now.

### Phase 4 – Build & Dev Tooling
- [ ] Update `vite.config.ts` to prefer `OPENCODE_WEB_PORT` when configuring `server.port` and to remove redundant manual env mirroring if helper is reused.
- [ ] Audit scripts (`scripts/vite-build.ts`, `packages/opencode-web/scripts/*`, root `server.ts` boot) to ensure no lingering references to removed env names.

### Phase 5 – Documentation & Samples
- [ ] Rewrite `.env.example` to list only the three canonical variables (plus optional extras like `VITE_BASE_PATH` if still relevant) and include migration comments.
- [ ] Update README sections: Command-line Options, Environment Variables, Getting Started, Production Build & Serve, Windows limitations.
- [ ] Add a changelog entry summarizing the breaking/behavioral changes and migration guidance.

### Phase 6 – Validation & Release Prep
- [ ] Manually verify matrix of scenarios (defaults, env-only, CLI overrides, bundled server disabled, Windows external server) per Validation Criteria below.
- [ ] Run `bun run lint`, `bun x tsc --noEmit`, `bun run test`, and `bun run build`.
- [ ] Coordinate release notes referencing issue #80 and the migration guide.

## Implementation Order & Milestones
1. **Milestone A – Config foundation**: Finish Phase 1 (helper + tests) to unlock dependent work.
2. **Milestone B – Server alignment**: Apply helper to Bun servers (Phase 2) so runtime behavior stabilizes.
3. **Milestone C – CLI + tooling**: Complete Phase 3 & 4 ensuring CLI, Vite, and scripts use the new surface.
4. **Milestone D – Docs & migration**: Execute Phase 5 updates and confirm `CONTEXT/PLAN` alignment with README.
5. **Milestone E – Validation & release**: Phase 6 tasks culminating in a tagged release and documentation update.

Dependencies: Phase 2 depends on Phase 1; Phase 3 depends on shared helper availability; Phase 4 depends on both; documentation (Phase 5) can start after variables are codified; validation (Phase 6) is last.

## Validation Criteria
| Scenario | How to Validate | Expected |
| --- | --- | --- |
| Defaults only | `bun run dev` with no env overrides | Web server listens on `localhost:3000`, connects to bundled OpenCode server at `http://localhost:4096`.
| Env overrides | `OPENCODE_WEB_HOST=0.0.0.0 OPENCODE_WEB_PORT=8888 OPENCODE_SERVER_URL=http://10.0.0.5:5000 bun run start` | Server binds `0.0.0.0:8888`, SSE proxy targets `http://10.0.0.5:5000` without warnings.
| CLI overrides | `bunx packages/opencode-web/bin/opencode-web.js --host 0.0.0.0 --port 4444 --external-server http://127.0.0.1:5001` | Canonical env vars reflect CLI values; log confirms external server usage; bundled server stays disabled.
| Legacy env compatibility | `PORT=4500 HOST=0.0.0.0 bun run start` | Server honors old vars, emits single deprecation warning, and exposes same port/host via helper.
| Bundled server opts | `OPENCODE_SERVER_PORT=5002 bunx opencode-web` | Bundled server listens on 5002, canonical URL uses `http://127.0.0.1:5002`.
| Windows bunx limitation | Simulate or document `bunx` on Windows path; CLI should abort early with instructions referencing `OPENCODE_SERVER_URL` | Error message references new variable names and external server guidance.
| Build artifacts | `bun run build` followed by `bun run start` using `.env` with canonical vars | Production server prints canonical config and serves app without mismatches.

## Issue Integration Checklist
- [ ] Exactly three canonical env vars implemented and documented.
- [ ] Backward compatibility layer present with warnings.
- [ ] CLI flags map directly to canonical vars.
- [ ] Redundant legacy vars removed from docs/code (except compatibility layer).
- [ ] Precedence order documented and enforced in helper/tests.
- [ ] Docs (.env example, README, changelog) updated.
- [ ] Validation matrix executed with evidence captured in future PR description.

## Sample Canonical `.env`
```env
# Core configuration (preferred)
OPENCODE_SERVER_URL=http://localhost:4096
OPENCODE_WEB_HOST=0.0.0.0
OPENCODE_WEB_PORT=3000

# Optional: keep during migration if needed
# PORT=3000
# HOST=0.0.0.0
# VITE_BASE_PATH=""
```

## Risks & Mitigations
- **Hidden references** to old env names in downstream packages → Mitigate via `rg` search and CI lint to fail on deprecated identifiers.
- **User confusion during transition** → Provide console warnings plus README migration table; communicate via release notes.
- **Bundled server start failures on Windows** → Keep existing guardrails but update messaging to mention canonical env names and workarounds.

## Next Steps
1. Confirm owners for each milestone (e.g., CLI vs. docs) and capture in GitHub issue checklist.
2. Begin Phase 1 implementation with accompanying tests and PR referencing this plan.
