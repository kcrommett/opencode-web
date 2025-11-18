# Issue #143 Reproduction - SSE Proxy HTML Fallback

## Problem Description
When the upstream OpenCode server returns HTML (e.g., auth redirects, maintenance pages, error pages), 
the SSE proxy still sets `Content-Type: text/event-stream`, causing browsers to abort the EventSource 
connection due to MIME type mismatch.

## Affected Code Paths

### 1. Production Server (`server.ts:110-137`)
```typescript
const response = await fetch(eventUrl.toString(), { ... });
if (!response.ok) {
  // Only handles non-2xx status codes
}
// Always sets text/event-stream regardless of upstream content-type
return new Response(response.body, {
  headers: { "Content-Type": "text/event-stream", ... }
});
```

### 2. Package Server (`packages/opencode-web/server.ts:291-317`)
Same pattern - no content-type validation.

### 3. Vite Dev Proxy (`vite.config.ts:67-82`)
Uses http-proxy which passes through upstream responses without validation.
The `configure` callback only sets request headers, not response validation.

## Root Cause
All three code paths trust that upstream returns SSE when `response.ok` is true.
However, 200 OK responses can still be HTML (auth pages, error pages, etc.).

## Solution
1. Check `response.headers.get("content-type")` for `text/event-stream`
2. If not SSE, return a JSON error envelope with diagnostic info
3. Client should detect JSON response and show actionable error message

## Browser Behavior
When EventSource receives wrong content-type:
- Chrome: `EventSource's response has a MIME type ("text/html") that is not "text/event-stream"`
- The connection is aborted and onerror fires
- EventSource retries infinitely, creating a reconnect loop

## Test Scenarios
1. Point `OPENCODE_SERVER_URL` to a server returning HTML
2. Access `/api/events` endpoint
3. Observe that response should be JSON error envelope, not streamed HTML
