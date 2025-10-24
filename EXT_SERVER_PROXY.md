# External Server Proxy Stabilization Plan

## Context & Findings

- The CLI flag `--external-server` populates `process.env.VITE_OPENCODE_SERVER_URL`/`OPENCODE_SERVER_URL` in `packages/opencode-web/bin/opencode-web.js`, but several layers still fall back to the baked-in default `http://localhost:4096`.
- Static bundles under `dist/client` include the literal default URL because `import.meta.env.VITE_OPENCODE_SERVER_URL` is resolved at build time. When the CLI runs against a different upstream, browser-side code continues to call `localhost:4096`.
- Hard-coded URLs remain in multiple code paths:
  - `src/lib/opencode-http-api.ts:1-7` defines `OPENCODE_SERVER_URL` with an inline default that bypasses runtime overrides.
  - `src/app/index.tsx:959` and `:965` issue direct `fetch` calls against `http://localhost:4096`, bypassing the server proxy entirely.
  - `server.ts:17` and `packages/opencode-web/server.ts:17` embed the default URL for the SSE proxy route.
  - `vite.config.ts:23-36` proxies `/api/events` to the baked default unless the dev env is pre-populated.
- Because the hosted frontend sits behind a proxy and cannot reach the OpenCode server directly, every browser-initiated request must ultimately hit the web app first and be re-proxied. Any latent direct calls to the OpenCode API will fail in production.

## Desired Outcomes

- Honor `--external-server` (and env vars) everywhere without shipping `localhost:4096` inside client bundles.
- Route **all** browser traffic through the web server (no direct OpenCode API calls from the browser).
- Provide a single source of truth for the OpenCode server base URL that works during build time, server runtime, and client runtime.
- Keep the default of `http://localhost:4096` only as a last-resort fallback when no overrides are supplied.

## Implementation Plan

1. **Create a canonical configuration utility**
   - Add `src/lib/opencode-config.ts` exporting helpers such as `getOpencodeServerUrl()` (server-only), `getClientOpencodeConfig()` (serialized for the browser), and `normalizeBaseUrl(url: string)`.
   - The helper should resolve precedence: CLI flag/env (`process.env.OPENCODE_SERVER_URL`), Vite env (`process.env.VITE_OPENCODE_SERVER_URL`), SSR runtime `globalThis.__OPENCODE_SERVER_URL__`, and finally the default.
   - Ensure the helper strips trailing slashes and validates that values include a protocol to avoid malformed URLs downstream.

2. **Expose runtime config to the browser bundle**
   - In `src/app/__root.tsx`, import the new helper and inject a `<script>` tag that sets `window.__OPENCODE_CONFIG__ = { serverUrl: "..." }`.
   - For hydration safety, only serialize primitive data and escape the string to prevent XSS.
   - On the client side (e.g., in `opencode-http-api.ts`), read from `globalThis.__OPENCODE_CONFIG__` before falling back to `import.meta.env` or `process.env`. This keeps the client bundle agnostic of the concrete server URL until runtime.

3. **Update shared HTTP helper**
   - Refactor `src/lib/opencode-http-api.ts` to consume the configuration utility rather than defining `OPENCODE_SERVER_URL` inline.
   - Ensure every exported function ultimately targets the normalized base URL. Augment `buildUrl` to accept absolute overrides when the proxy endpoint already includes `/api/...`.
   - Consider memoizing the resolved URL to avoid repeated lookups while still honoring runtime overrides during SSR.

4. **Fix browser-only shortcuts**
   - Replace the hard-coded debug/export fetches in `src/app/index.tsx:942-999` with calls through `openCodeService` or new server functions that wrap the existing HTTP helper.
   - If new server functions are required (e.g., to fetch the raw session payload used for debugging), add them to `src/lib/opencode-server-fns.ts` so the browser still calls `/api/...` on the web host.
   - Add concise comments explaining why these flows must proxy through the server (due to the separate frontend deployment).

5. **Align Bun server proxies**
   - Update `server.ts` and `packages/opencode-web/server.ts` to import the config helper and use the normalized URL when proxying `/api/events`.
   - Make the SSE proxy more defensive: log a clear warning if the upstream URL is missing, and return a 500 with guidance rather than silently pointing at localhost.
   - Confirm any other ad-hoc proxy code paths inside these files also use the helper (search for additional `new URL(... OPENCODE_SERVER_URL ...)` instances).

6. **Ensure dev server honors overrides**
   - Amend `vite.config.ts` to pull the base URL from the helper in a build-safe way. Because Vite config runs in Node during build, it can import the helper directly or read from `process.env` using the same precedence logic.
   - Update the `/api/events` proxy target and rewrite logic to respect the normalized URL, and document in a code comment that the CLI populates `process.env` before invoking Vite.

7. **Documentation & samples**
   - Update `README.md` and `.env.example` to explain the precedence order and how to run with an external server (include CLI flag and env var examples).
   - Note in the README that browser access to the OpenCode server must be mediated through the web app, highlighting the proxy requirement for anyone customizing deployments.

8. **Build artifacts & packaging**
   - After code changes, rebuild `packages/opencode-web/dist` (or adjust the release script) so the packaged CLI ships with the new runtime-aware logic. Confirm `dist/client` bundles no longer include `http://localhost:4096`.
   - Ensure `packages/opencode-web/server.js` stays in sync with `server.ts` via the existing build pipeline instead of manual edits.

## Verification Plan

- Run `bun run build` followed by `bun server.ts` with:
  1. No overrides (expect default `http://localhost:4096`).
  2. `VITE_OPENCODE_SERVER_URL=https://example.com bun server.ts`.
  3. `bun packages/opencode-web/bin/opencode-web.js --external-server https://example.com`.
- In each scenario, confirm via logging (or Bun inspector) that `/api/...` requests are proxied to the chosen upstream and that the browser bundles no longer embed the default URL (e.g., `rg` against `dist/client`).
- Exercise the debug/export flows in the UI to ensure they still work and now route through the server.
- Optionally add an automated test (e.g., a small Bun test harness) that asserts `getOpencodeServerUrl()` respects env precedence.

## Open Questions / Follow-ups

All diagnostic needs stay server-side; the browser does not display or rely on the resolved OpenCode server URL. Only a single upstream endpoint is required, so the configuration helper can stay focused on that single base URL.
