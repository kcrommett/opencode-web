# Agent Switching Fix Plan

## Findings
- The UI loads agents and updates `currentAgent` in context, but `sendMessage` in `src/hooks/useOpenCode.ts` never uses that state, so every request goes out without an agent hint.
- `openCodeService.sendMessage` (see `src/lib/opencode-client.ts`) and the server proxy in `src/lib/opencode-server-fns.ts` forward only `sessionId`, `content`, and optional model identifiers.
- The HTTP layer (`src/lib/opencode-http-api.ts`) builds the POST body with `parts` and optional `model`, leaving out the agent/mode field the OpenCode backend expects, causing the server to fall back to the default build agent despite any selection.
- SSE payloads expose the agent under `message.metadata.agent`, confirming the backend is capable of echoing the chosen mode once it is supplied.

## Remediation Steps
1. Confirm which identifier the backend expects for agent selection (likely the `id`/`mode` field returned by `/agent`) and extend our `Agent` type to carry it explicitly.
2. Thread the selected agent through the message pipeline: extend `sendMessage` in `useOpenCode`, update its callers (currently `handleSend` in `src/app/index.tsx`), and ensure we fall back gracefully when no agent is selected.
3. Propagate the new parameter through `openCodeService.sendMessage`, the server function wrapper, and `opencode-http-api.ts`, adding the appropriate `mode` (or equivalent) field to the POST payload.
4. Verify the UI still displays agent metadata correctly and that local persistence (localStorage) stays in sync after the type changes.
5. Manually test: switch to the plan agent, send a message, and confirm the SSE metadata (and rendered UI) reports the plan agent. Re-run `bun run lint` and `bun x tsc --noEmit`.

## Open Questions / Follow-Ups
- Do other endpoints (e.g., session initialization or summarization helpers) also need agent awareness to avoid similar defaults?
- Should agent preference persist per session instead of globally, or is the current behavior intentional?
- Would an integration test or telemetry hook help detect regressions for agent routing in the future?
