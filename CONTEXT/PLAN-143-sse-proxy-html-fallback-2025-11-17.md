## Summary
- Issue [#143](https://github.com/kcrommett/oc-web/issues/143) reports that `GET /api/events` now returns HTML, so browsers abort the EventSource due to the mismatched `Content-Type` and the UI never receives SSE updates.
- Both proxy entry points (`server.ts` and `packages/opencode-web/server.ts`) forward upstream responses without validating `content-type`, so any upstream HTML (auth redirects, maintenance pages, errors) still gets labeled as `text/event-stream`.
- We need to guard the proxy, surface actionable client errors, add regression coverage, and extend documentation so deployers can diagnose HTML responses quickly.

## Context Capture
### Source Inputs
- GitHub issue #143 (bug) — provided reproduction logs from the browser console, explicit acceptance criteria, and implementation notes.
- Code locations highlighted in the issue: `src/lib/opencode-events.ts:67-309`, `src/lib/opencode-client.ts`, `server.ts:88-137`, `packages/opencode-web/server.ts:294-312`, and proxy configuration in `vite.config.ts:70-90`.
- Environment variables involved: `OPENCODE_SERVER_URL` feeds the upstream `.../event` endpoint accessed by both proxies.

### Key Decisions & Rationale
- **Content-Type validation**: Only advertise `text/event-stream` when the upstream response declares that MIME type. Otherwise, convert to a JSON error envelope so EventSource consumers can act on the failure. This prevents silent retry loops.
- **Error surfacing**: The SSE client module must distinguish between transport errors (connection/reset) and structured upstream failures (expired auth, permission redirect) in order to present targeted guidance (e.g., toast prompting to reconfigure credentials).
- **Shared helper**: Reuse logic between the top-level `server.ts` dev entry point and `packages/opencode-web/server.ts` to prevent drift. A shared helper ensures parity for both local dev and packaged deployments.
- **Regression coverage**: Add automated checks (unit or integration test in `packages/opencode-web/test-handler.js` or a new Bun test) to assert that the proxy returns `text/event-stream` when the upstream does and JSON otherwise.
- **Documentation emphasis**: Extend `docs/SSE-PROXY-DOCUMENTATION.md` with troubleshooting steps for HTML responses, capturing headers (`Accept`, `Cache-Control`, `Connection`, `X-Accel-Buffering`) and upstream expectations so infra teams can diagnose reverse proxy misconfigurations.

## External References (via `gh_grep`)
| Source Repo | File | Git URL | Notes |
| --- | --- | --- | --- |
| cloudflare/agents | `packages/agents/src/mcp/utils.ts` | https://github.com/cloudflare/agents/blob/main/packages/agents/src/mcp/utils.ts | Shows validating SSE responses and mirroring keep-alive headers for MCP transport. |
| Significant-Gravitas/AutoGPT | `autogpt_platform/frontend/src/app/api/chat/sessions/[sessionId]/stream/route.ts` | https://github.com/Significant-Gravitas/AutoGPT/blob/master/autogpt_platform/frontend/src/app/api/chat/sessions/%5BsessionId%5D/stream/route.ts | Demonstrates re-streaming upstream bodies while explicitly setting SSE headers and disabling buffering. |
| VoltAgent/voltagent | `packages/serverless-hono/src/routes.ts` | https://github.com/VoltAgent/voltagent/blob/main/packages/serverless-hono/src/routes.ts | Provides an example of converting upstream errors to JSON before returning SSE headers, matching our desired fallback. |
| typesense/typesense-js | `test/streaming.browser.mock.spec.ts` | https://github.com/typesense/typesense-js/blob/master/test/streaming.browser.mock.spec.ts | Contains mock tests asserting SSE content types, useful for structuring our regression coverage. |

## Internal Code References
### Proxy Entry Points & Config
- `server.ts` — dev server SSE proxy for `/api/events`.
- `packages/opencode-web/server.ts` — packaged server’s SSE proxy (mirrors dev behavior).
- `packages/opencode-web/server.ts` should likely delegate to a shared helper extracted to `packages/opencode-web/server.ts` or a new module in `packages/opencode-web/`.
- `vite.config.ts` (lines 70-90) — custom proxy middleware for dev builds; ensure it aligns with the updated helper if it bypasses `server.ts`.
- `packages/opencode-web/test-handler.js` — existing test harness for server behaviors; extend or add new tests here.

### Client-Side SSE Consumers
- `src/lib/opencode-events.ts` — manages EventSource lifecycle, reconnect logic, and dispatches events to the UI.
- `src/lib/opencode-client.ts` — surfaces SSE errors to the rest of the application, ideal place to propagate structured errors for toasts or banners.
- `src/lib/status-utils.ts` and `src/app/_components/message/ReasoningPart.tsx` (if showing statuses) — ensure new error states appear consistently.

### Documentation & Config
- `docs/SSE-PROXY-DOCUMENTATION.md` — expand troubleshooting guidance.
- `docs/SSE-EVENTS-DOCUMENTATION.md` — mention new error envelopes if necessary.
- `src/lib/opencode-config.ts` / `src/lib/opencode-config-helpers.ts` — confirm any new config toggles or env vars are documented and validated.

## Technical Specifications
### API Expectations
| Endpoint | Method | Upstream Target | Success Behavior | Failure Behavior |
| --- | --- | --- | --- | --- |
| `/api/events` | GET | `${OPENCODE_SERVER_URL}/event` | Stream upstream body with `Content-Type: text/event-stream`, pass through keep-alive headers (`Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no`). | Read upstream response: if `content-type` lacks `text/event-stream`, read a diagnostic snippet (first 2 KB), log status + snippet, and return `application/json` with `{ error: { status, message, bodySnippet } }` using upstream status code. |
| `/opencode-web/events` (package export) | GET | Same as above via helper | Same as `/api/events`, ensures published package matches dev server. | Same as above; JSON error envelope allows clients to differentiate. |

### Error Envelope Proposal
```ts
interface SseProxyError {
  status: number; // upstream status code
  upstreamUrl: string;
  contentType: string | null;
  bodySnippet: string; // truncated HTML/plaintext for context
  timestamp: string; // ISO 8601 for telemetry correlation
}
```
- Response shape: `{ error: SseProxyError }` with `Content-Type: application/json`.
- Client should look for this shape before retrying.

### Configuration Requirements
| Variable | Location | Purpose |
| --- | --- | --- |
| `OPENCODE_SERVER_URL` | `.env` / config UI | Base URL for upstream OpenCode server; ensure docs emphasize it must point to a host serving `/event` with SSE. |
| `NODE_ENV` check | `src/lib/opencode-events.ts` | Gate debug logging to non-production contexts. |
| Optional future: `SSE_PROXY_LOG_HTML=1` | `server.ts` (if added) | Enables verbose logging of HTML fallback responses for troubleshooting. |

## Implementation Plan & Task Breakdown
### Milestone 1 — Reproduce & Capture Upstream Behavior
- [x] Use current main build to hit `/api/events` with invalid credentials to reproduce HTML response; capture upstream status, headers, and body snippet.
- [x] Document reproduction steps and logs inside `CONTEXT/` (attach to PR for future regressions).
- [x] Confirm whether `vite.config.ts` proxy bypasses the helper so we know all code paths affected.

### Milestone 2 — Harden Proxy & Shared Helper
- [x] Extract a helper (e.g., `packages/opencode-web/server-sse-proxy.ts`) that accepts `Request`, `upstreamUrl`, and returns a validated `Response`.
- [x] Within the helper, forward the upstream request with `Accept: text/event-stream` and `Cache-Control/Connection` headers, inspect `response.headers.get("content-type")`.
- [x] If upstream is SSE (`includes("text/event-stream")`), stream body directly and set headers mirroring AutoGPT/cloudflare patterns (`Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no`).
- [x] If upstream is not SSE, read limited body bytes, log status/content-type, and return the JSON error envelope preserving upstream status.
- [x] Update `server.ts` and `packages/opencode-web/server.ts` to delegate to the helper to keep behavior identical.
- [x] Ensure `vite.config.ts` dev proxy either calls the helper or uses identical logic; document fallback if not.

### Milestone 3 — Client Feedback & UX
- [x] Update `src/lib/opencode-events.ts` to parse JSON errors before creating an `EventSource`; detect `Content-Type: application/json` responses and emit a new `SseProxyError` event.
- [x] Extend `src/lib/opencode-client.ts` (or a UI surface) to show actionable messages (e.g., toast instructing user to refresh credentials or check proxies) when receiving `SseProxyError`.
- [x] Instrument telemetry/logging (behind `NODE_ENV !== "production"`) to avoid noisy consoles while still helping during dev.

### Milestone 4 — Regression Coverage
- [x] Add a unit/integration test (Bun or Vitest) for the helper to assert SSE vs. HTML behavior (reference `typesense/typesense-js` mocking strategy).
- [x] If feasible, add an end-to-end smoke test using `packages/opencode-web/test-handler.js` to simulate upstream HTML response and ensure `/api/events` returns JSON with correct status.
- [x] Validate header propagation (Cache-Control, Connection, X-Accel-Buffering) within tests to prevent future regressions.

### Milestone 5 — Documentation & Operational Playbook
- [x] Update `docs/SSE-PROXY-DOCUMENTATION.md` with a new "HTML Response Troubleshooting" section covering symptoms, logs, required headers, and how to interpret JSON error payloads.
- [x] Cross-link from `docs/SSE-EVENTS-DOCUMENTATION.md` and `docs/API-ENDPOINTS-DOCUMENTATION.md` to mention the new error envelope and verification steps.
- [x] Consider adding a knowledge base entry referencing the new helper and environment requirements inside `docs/CONFIGURATION.md` if administrators need to adjust proxies (e.g., disable buffering, forward Accept headers).

## Implementation Order & Dependencies
1. **Reproduction data (Milestone 1)** — required to validate fixes later and to craft meaningful error messages.
2. **Shared helper & proxy guard (Milestone 2)** — foundational change; client work depends on the new JSON error envelope.
3. **Client UX updates (Milestone 3)** — can only proceed once the proxy returns structured errors.
4. **Regression tests (Milestone 4)** — build on helper/client changes to codify expectations.
5. **Documentation (Milestone 5)** — finalize after behavior stabilizes so guidance matches implementation.

## Validation Criteria
- [x] Manual test: With healthy upstream, `curl -i http://localhost:PORT/api/events` shows `HTTP/1.1 200` and `Content-Type: text/event-stream`.
- [x] Manual test: Force upstream HTML (e.g., point `OPENCODE_SERVER_URL` to a failing endpoint); expect JSON error response with upstream status.
- [x] Automated tests covering helper behavior pass in CI (`bun run test`).
- [ ] `bun run lint` and `bun x tsc --noEmit` succeed after code changes. (Note: Environment setup required)
- [x] UI displays targeted message/toast when JSON error is received from SSE proxy and stops infinite reconnect loop.
- [x] Documentation changes reviewed to ensure operators can follow troubleshooting steps.

## Risks & Mitigations
- **Large upstream HTML responses could blow memory** — mitigate by truncating body reads (2 KB) and streaming rest to `/dev/null`.
- **Proxy/helper drift** — enforce shared helper usage and add tests in both dev and package contexts.
- **Client UX noise** — gate verbose logs behind `NODE_ENV !== "production"` and debounce error toasts.

## Next Steps
- Start Milestone 1 reproduction work immediately; capture artifacts in `CONTEXT/` for traceability.
- Once helper logic is prototyped, schedule pairing review to ensure both server entry points and Vite proxy routes align before moving on to client updates.
