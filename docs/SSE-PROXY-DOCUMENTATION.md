# SSE Proxy Architecture

This document captures how Server‑Sent Events (SSE) flow through the OC Web stack. It covers URL resolution, dev/prod proxy layers, and the browser client so we can troubleshoot regressions quickly.

## High‑Level Flow

1. **Browser** (`src/lib/opencode-events.ts`) opens `EventSource("/api/events?directory=…")`.
2. **Local web server** (Vite dev server or Bun production server) handles `/api/events`.
3. **Proxy handler** rewrites the request to `{OPENCODE_SERVER_URL}/event` (preserving the `directory` query) and forwards the raw SSE stream.
4. **OpenCode Server** (typically the CLI-managed instance on port `4096` or a remote server) produces the event stream.

## Resolving the Upstream OpenCode Server URL

All proxy code relies on `src/lib/opencode-config.ts`:

1. `normalizeBaseUrl()` strips trailing slashes and validates protocols.
2. `resolveServerUrlFromEnv()` chooses the first non-empty value from:
   - `process.env.OPENCODE_SERVER_URL`
   - `process.env.VITE_OPENCODE_SERVER_URL`
   - `import.meta.env.VITE_OPENCODE_SERVER_URL` (so Vite dev builds can embed `.env.local` values)
   - `globalThis.__OPENCODE_SERVER_URL__` (set by the CLI at runtime)
   - Fallback: `http://localhost:4096`
3. `getClientOpencodeConfig()` serializes `{ serverUrl }` so the browser stays in sync with the server’s runtime choice.

`src/app/__root.tsx` injects the resolved config via:

```html
<script>
  window.__OPENCODE_CONFIG__ = { "serverUrl": "https://…" };
</script>
```

This guarantees hydration parity and tells client-side code which upstream host to target when the app launches in a pre-rendered environment.

## Development Proxy (Vite)

- File: `vite.config.ts`
- `loadEnv()` pulls `.env`, `.env.local`, etc. We immediately copy `VITE_OPENCODE_SERVER_URL` and `OPENCODE_SERVER_URL` into `process.env` so helpers that read from `process.env` (such as `getOpencodeServerUrl`) see the same values.
- The Vite dev server exposes `/api/events` with:

```ts
proxy: {
  "/api/events": {
    target: getOpencodeServerUrl(),
    changeOrigin: true,
    rewrite: (path) => {
      const url = new URL(path, getOpencodeServerUrl());
      const directory = url.searchParams.get("directory");
      return `/event${directory ? `?directory=${directory}` : ""}`;
    },
    configure: (proxy) => {
      proxy.on("proxyReq", (proxyReq) => {
        proxyReq.setHeader("Accept", "text/event-stream");
        proxyReq.setHeader("Cache-Control", "no-cache");
        proxyReq.setHeader("Connection", "keep-alive");
      });
    },
  },
},
```

- Because the CLI launches Vite with env vars already set, this dev proxy “just works” when running `bun run dev`. If the upstream server isn’t reachable, the browser console will show `AggregateError [ECONNREFUSED]` and the Vite dev server logs will surface `/event` proxy errors.

## Production Proxy (Bun Server)

- Files: `server.ts` (monorepo root) and `packages/opencode-web/server.ts` (published package).
- Both servers:
  - Accept `--external-server <url>` CLI flag to populate `OPENCODE_SERVER_URL`/`VITE_OPENCODE_SERVER_URL`.
  - Respect `VITE_BASE_PATH` when stripping prefixes from incoming URLs.
  - Disable `idleTimeout` in `Bun.serve()` so SSE connections stay alive indefinitely.

### `/api/events` Handler (Prod)

The production proxy uses a shared helper (`packages/opencode-web/sse-proxy.ts`) that validates the upstream response's `Content-Type` before streaming:

```ts
if (pathname === "/api/events") {
  const directory = url.searchParams.get("directory");
  const serverUrl = getOpencodeServerUrl();
  if (!serverUrl || serverUrl === "http://localhost:4096") {
    console.warn("[SSE Proxy] Warning: OpenCode server URL is missing…");
    return Response.json({ error: "OpenCode server URL not configured…" }, { status: 500 });
  }
  const eventUrl = buildEventUrl(serverUrl, directory);
  return proxySseRequest(eventUrl, { enableLogging: !IS_PRODUCTION });
}
```

The `proxySseRequest` helper:
1. Sends the request with `Accept: text/event-stream` header
2. Validates that the upstream response has `Content-Type: text/event-stream`
3. If valid SSE, streams the body with proper headers (`Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no`)
4. If not SSE (e.g., HTML auth page), returns a JSON error envelope with diagnostic information

Error paths intentionally log clear guidance (“Set `VITE_OPENCODE_SERVER_URL`”) so production builds surface misconfiguration quickly.

## Browser SSE Client

- File: `src/lib/opencode-events.ts`
- Creates `EventSource("/api/events?directory=<current project>")`.
- Handles `open`, `message`, and `error` events, logging when `NODE_ENV !== "production"`.
- On errors (network drops, proxy failures) it emits `SSEConnectionState.Error`, prompting UI components to show reconnect banners.

Because the browser only ever talks to `/api/events` on the same origin, we avoid CORS issues. The server-side proxies take care of cross-origin calls to the actual OpenCode server.

## Common Failure Modes & Debug Tips

| Symptom | Likely Cause | What to Check |
| --- | --- | --- |
| `ECONNREFUSED` from `/api/events` | Upstream server isn't running or URL is wrong | Verify `VITE_OPENCODE_SERVER_URL`/`OPENCODE_SERVER_URL`, ensure CLI-launched server is online |
| Hydration mismatch where `window.__OPENCODE_CONFIG__` differs | Server and client resolved different URLs | Make sure `getClientOpencodeConfig()` uses the same helper as `getOpencodeServerUrl()` (fixed in this session) |
| SSE errors right after dev server starts | Vite proxy still pointing at default `http://localhost:4096` | Confirm `.env.local` values are loaded; with recent changes `loadEnv` syncs into `process.env` |
| 500 with `[SSE Proxy] Warning…` | We intentionally reject when upstream URL is missing | Set `VITE_OPENCODE_SERVER_URL` (and `OPENCODE_SERVER_URL` if runtime override is needed) |
| **Windows + bunx**: `error: interpreter executable "/bin/sh" not found` | Cannot launch bundled server via bunx on Windows | Use `--external-server http://127.0.0.1:4096` or install locally. See [Windows + bunx Limitation](../README.md#windows--bunx-limitation) |
| JSON error with `"contentType": "text/html"` | Upstream returned HTML instead of SSE (auth redirect, error page) | Check `OPENCODE_SERVER_URL`, verify credentials/auth, see HTML Response Troubleshooting below |

### HTML Response Troubleshooting

When the upstream OpenCode server returns HTML instead of SSE (e.g., auth redirects, maintenance pages, error pages), the proxy now returns a JSON error envelope instead of silently passing through the HTML:

```json
{
  "error": {
    "status": 200,
    "upstreamUrl": "http://localhost:4096/event",
    "contentType": "text/html",
    "bodySnippet": "<!DOCTYPE html><html>...",
    "timestamp": "2025-11-17T10:30:00.000Z"
  }
}
```

**Common causes of HTML responses:**

1. **Authentication required**: The upstream server is behind an auth proxy that redirects to a login page
2. **Incorrect URL**: `OPENCODE_SERVER_URL` points to a web server instead of the OpenCode API
3. **Maintenance mode**: The upstream server is in maintenance mode and returning a status page
4. **Reverse proxy misconfiguration**: An intermediary proxy is serving a cached or error page

**Debugging steps:**

1. **Check the body snippet**: The JSON error includes the first 2KB of the HTML response to help identify the issue
2. **Verify the upstream URL directly**: `curl -i "$OPENCODE_SERVER_URL/event"` should return `Content-Type: text/event-stream`
3. **Check required headers**: Ensure reverse proxies forward `Accept: text/event-stream` and don't cache/buffer the response
4. **Disable proxy buffering**: Set `X-Accel-Buffering: no` for nginx, `ProxyPass` with `flushpackets=on` for Apache
5. **Review auth configuration**: If using OAuth/SAML, ensure the `/event` endpoint is excluded from auth redirects

**Client-side handling:**

The UI will display a toast with details about the error. The SSE client will not retry automatically when it receives a proxy error, since these typically indicate configuration issues that require manual intervention.

### Windows-Specific Troubleshooting

When using opencode-web on Windows, the `/api/events` proxy depends on a reachable OpenCode server. Due to Bun's `/bin/sh` limitation, `bunx opencode-web` cannot auto-launch the bundled server.

**Required Setup for Windows + bunx:**

1. **Start an external OpenCode server** in a separate terminal:
   ```powershell
   # Ensure OpenCode CLI is installed
   # Download from: https://github.com/opencode-ai/opencode
   
   # Start the server on default port
   opencode serve --hostname=127.0.0.1 --port=4096
   ```

2. **Point opencode-web to the external server:**
   ```powershell
   bunx opencode-web@latest --external-server http://127.0.0.1:4096
   ```

3. **Verify the connection:**
   - The web UI should connect automatically
   - Check browser DevTools Network tab for `/api/events` requests
   - Look for SSE events flowing in the Network tab (event stream)

**If SSE proxy still fails on Windows:**

- **Check server URL**: Use `127.0.0.1` instead of `localhost` (Windows networking quirk)
- **Firewall**: Ensure Windows Firewall allows localhost connections on port 4096
- **Port conflicts**: If 4096 is in use, start the server on a different port:
  ```powershell
  opencode serve --hostname=127.0.0.1 --port=4097
  bunx opencode-web@latest --external-server http://127.0.0.1:4097
  ```
- **Test server health**: Visit `http://127.0.0.1:4096/health` in your browser

**Local Install (Recommended for Windows):**

Installing locally avoids the bunx limitation entirely:
```powershell
bun install opencode-web
bun run opencode-web
```

With a local install, the bundled server launches automatically on Windows.

## Environment Variable Recipes

### Local development against CLI-managed server

```bash
VITE_OPENCODE_SERVER_URL=http://localhost:4096 \
OPENCODE_SERVER_URL=http://localhost:4096 \
bun run dev
```

### Local development against remote server

```bash
VITE_OPENCODE_SERVER_URL=https://code.example.com \
OPENCODE_SERVER_URL=https://code.example.com \
bun run dev
```

### Production server pointing at remote OpenCode instance

```bash
VITE_OPENCODE_SERVER_URL=https://code.example.com \
OPENCODE_SERVER_URL=https://code.example.com \
bun run build && \
PORT=3000 bun start
```

Or pass `--external-server https://code.example.com` to `bun start` (the flag sets both env vars internally).

## Related Files

- `src/lib/opencode-config.ts` – shared URL helpers
- `src/app/__root.tsx` – injects `window.__OPENCODE_CONFIG__`
- `vite.config.ts` – dev proxy and env sync
- `server.ts` / `packages/opencode-web/server.ts` – production proxy implementation
- `packages/opencode-web/sse-proxy.ts` – shared SSE proxy helper with content-type validation
- `packages/opencode-web/sse-proxy.test.ts` – unit tests for SSE proxy helper
- `src/lib/opencode-events.ts` – client-side SSE with proxy error handling
- `src/lib/opencode-client.ts` – SSE client wrapper with `onProxyError` callback
- `AGENT_FIX.md`, `EXT_SERVER_PROXY.md` – historical context for proxy fixes (keep for changelog references)

Keep this document updated whenever we touch `getOpencodeServerUrl`, the proxy handlers, or the SSE client so future debugging sessions have a single source of truth.

