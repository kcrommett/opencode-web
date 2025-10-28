## Overview
- Aligns GH issue 47 with a detailed execution roadmap for enhancing in-app tool call visualization.
- Focuses on React message parts under `src/app/_components/message` for clarity and responsiveness.
- Records conversation-driven requirements: context capture, tasks, specs, validation, references.
- Establishes milestones, dependencies, and QA gates to enable predictable delivery.

## Context Capture

### Session Decisions & Rationale
- Store this plan in `CONTEXT` with markdown structure and checklists per instructions.
- Cover UI, data, and validation pathways so no additional context gathering is required.
- Provide explicit internal file references and external Git URLs to expedite implementation.
- Treat "gh issue 47" as directive to improve tool call presentation for assistant messages.

### Existing Implementation Snapshot
| Concern | File Reference | Notes |
| --- | --- | --- |
| Tool part rendering | `src/app/_components/message/ToolPart.tsx:10` | Renders status card, toggles input/output, relies on minimal metadata parsing.
| Message part dispatcher | `src/app/_components/message/MessagePart.tsx:17` | Routes `tool` parts into `ToolPart`, ensuring updates cascade from message state.
| Reasoning context | `src/app/_components/message/ReasoningPart.tsx:83` | Provides expandable cards that can inspire tool detail UX patterns.
| Text payload formatting | `src/app/_components/message/TextPart.tsx:8` | Switches typography based on code content; reuse patterns for tool inputs/outputs.
| File metadata presentation | `src/app/_components/message/FilePart.tsx:8` | Demonstrates badge usage for metadata chips.
| Status styling | `src/app/globals.css:778` | Defines `.status-card` states for running/completed/error backgrounds and borders.
| Data model contract | `src/types/opencode.ts:2` | Declares generic `Part` shape; tool enhancements may need structured typing extensions.
| HTTP data access | `src/lib/opencode-http-api.ts:25` | Supplies REST helpers (sessions, messages, tools) used by message fetch flows.
| SSE updates | `src/lib/opencode-events.ts:236` | Streams `message.part.updated` events powering live tool call updates.
| Config resolution | `src/lib/opencode-config.ts:1` | Normalizes server URLs from env/import meta for API and SSE clients.
| API reference | `CONTEXT/API-ENDPOINTS-DOCUMENTATION.md:1` | Catalogs REST surface to cross-check endpoint usage and query params.
| Event semantics | `CONTEXT/SSE-EVENTS-DOCUMENTATION.md:1` | Details message/event lifecycle to validate streaming assumptions.

### Data & Event Flow
- Tool call payloads originate from `/session/{id}/message` REST responses and stream via `message.part.updated` SSE events `src/lib/opencode-events.ts:236`.
- Parts are normalized into the `Part` union before rendering, with ToolPart relying on dynamic keys like `input`, `output`, and `state` `src/types/opencode.ts:2`.
- UI state toggles are managed locally inside `ToolPart` with `useState` hooks `src/app/_components/message/ToolPart.tsx:11`, causing re-renders without context sharing.
- Styling derives from global CSS tokens defined in `src/app/globals.css:778`, influenced by theme configuration from `@webtui/css`.
- Environment configuration for API base URLs flows through `getOpencodeServerUrl` `src/lib/opencode-config.ts:33`, ensuring tool cards operate across deployments.

## Technical Specifications

### UI Behaviour Requirements
- Display tool name, provider, status, and timestamp in a single accessible header using semantic buttons for toggles.
- Present input/output payloads with syntax-aware formatting and copy affordances, collapsing large responses by default with clear indicators.
- Surface error metadata (messages, stack snippets) distinctly with severity styling tied to `.status-card.error` classes `src/app/globals.css:795`.
- Support responsive layouts that stack metadata on narrow viewports while preserving quick-glance status cues.
- Provide loading indicators that animate smoothly without blocking subsequent SSE updates (`running` status).

### Data Models
- Introduce structured interfaces for tool call payloads extending `Part` with typed `input`, `output`, and `state` shapes `src/types/opencode.ts:2`.
- Map tool status enums (`running`, `completed`, `error`, `pending`) to UI-friendly labels via constants colocated with `ToolPart` rendering logic `src/app/_components/message/ToolPart.tsx:29`.
- Capture optional duration/metrics fields when available (`part.state?.timings`) for timeline visualization, defaulting gracefully when absent.
- Persist normalized tool metadata in session-level stores to avoid redundant parsing during rerenders triggered by SSE diffs.

### API Endpoints & Event Subscriptions
| Endpoint/Event | Method/Type | Usage | Source |
| --- | --- | --- | --- |
| `/session/{id}/message` | GET | Fetch initial assistant message parts including tool calls | `src/lib/opencode-http-api.ts:108` |
| `/session/{id}/message` | POST | Sends follow-up user prompts triggering new tool executions | `src/lib/opencode-http-api.ts:138` |
| `/experimental/tool` | GET | Retrieves JSON schema for available tools to enrich UI metadata | `src/lib/opencode-http-api.ts:581` |
| `/event` | SSE | Streams `message.updated` and `message.part.updated` events for live updates | `CONTEXT/SSE-EVENTS-DOCUMENTATION.md:616` |
| `message.part.updated` | SSE payload | Signals incremental tool state changes rendered by ToolPart | `src/lib/opencode-events.ts:123` |
| `/config/providers` | GET | Supplies provider display names/icons for tool header badges | `src/lib/opencode-http-api.ts:33` |

### Configuration Requirements
| Key | Description | Source |
| --- | --- | --- |
| `OPENCODE_SERVER_URL` | Primary server base URL for REST and SSE clients | `src/lib/opencode-config.ts:9` |
| `VITE_OPENCODE_SERVER_URL` | Frontend build-time override for same base URL | `src/lib/opencode-config.ts:23` |
| `__OPENCODE_CONFIG__.serverUrl` | Runtime injection enabling browser-hosted deployments | `src/lib/opencode-config.ts:36` |
| Theme tokens (`@webtui/css`) | Ensure status colors align with updated visuals | `package.json:24` |

### Integration Points
- Reuse badge variants from `src/app/_components/message/FilePart.tsx:22` and `src/app/_components/ui/badge.tsx` for tool metadata chips.
- Coordinate with reasoning card UX `src/app/_components/message/ReasoningPart.tsx:105` to maintain consistent accordion semantics.
- Align highlight styles with `highlight.js` usage defined in `package.json:28` to render JSON/body previews.
- Update documentation assets under `docs/screenshots` once UI changes are finalized.

## Actionable Tasks

### Milestone 1 – Discovery & Design Alignment
- [x] Audit current `ToolPart` rendering and identify pain points across desktop/mobile screens `src/app/_components/message/ToolPart.tsx:10`.
- [x] Review `.status-card` theming for opportunities to add neutral/info states `src/app/globals.css:778`.
- [x] Gather user expectations from GH issue 47 comments and prior support tickets.
- [x] Produce responsive wireframes covering success, running, and error scenarios, including large payload handling.

### Milestone 2 – Component Architecture & Data Preparation
- [x] Extract normalization helpers for tool status/state data within `src/app/_components/message/ToolPart.tsx:29`.
- [x] Extend `Part` typings or add dedicated `ToolPartDetail` interface in `src/types/opencode.ts:2` to capture structured fields.
- [x] Add provider/tool metadata lookup via `/experimental/tool` caching in `src/lib/opencode-http-api.ts:581`.
- [x] Ensure SSE handlers in `src/lib/opencode-events.ts:261` merge partial updates without dropping previous payloads.

### Milestone 3 – UI Implementation & Styling
- [x] Implement redesigned header with icons, duration, and copy-to-clipboard controls in `ToolPart`.
- [x] Replace plain toggle text with accessible buttons leveraging shared UI primitives in `src/app/_components/ui/button.tsx`.
- [x] Introduce syntax-highlighted payload blocks with configurable max-height and overflow controls.
- [x] Update `.status-card` variants and theme tokens to match new palette while preserving contrast ratios `src/app/globals.css:778`.

### Milestone 4 – Integration, Validation, and Documentation
- [x] Test streaming updates by simulating rapid `message.part.updated` events through mocked SSE sources `src/lib/opencode-events.ts:275`.
- [ ] Add regression tests or storybook scenarios ensuring toggles, copy buttons, and error messages behave as expected.
- [ ] Refresh contextual docs/screenshots and note UI changes in release notes.
- [x] Prepare migration guidance for downstream consumers if new props/types are exported.

## Implementation Order & Milestones
1. Complete Milestone 1 discovery to finalize UX requirements and wireframes; outcomes gate later work.
2. Execute Milestone 2 to solidify data contracts and streaming safety nets before visual changes.
3. Deliver Milestone 3 UI updates once data helpers are stable, iterating with design feedback.
4. Finish Milestone 4 validation/documentation, ensuring QA sign-off and stakeholder visibility prior to release.

## Validation Criteria
- [ ] All new and existing tool states render correctly under unit and integration tests (snapshot updates approved).
- [ ] Streaming sessions show progressive updates without flicker or state loss when toggling input/output.
- [ ] Mobile (<768px) and desktop layouts tested manually or via responsive tooling, meeting accessibility guidelines.
- [ ] Commands below run clean: `bun run lint`, `bun x tsc --noEmit`, `bun run test`.
- [ ] Documentation and screenshots updated to reflect new UI, and release notes highlight user-facing improvements.

## External References
| Library | Purpose | Git URL |
| --- | --- | --- |
| React 19 | Core UI rendering | https://github.com/facebook/react |
| @tanstack/react-router & react-start | Routing/data loading patterns | https://github.com/TanStack/router |
| @webtui/css | Theme tokens aligning status colors | https://github.com/webtui/css |
| highlight.js | Syntax highlighting for tool payloads | https://github.com/highlightjs/highlight.js |

## Tooling & Command Reference
```bash
bun run lint
bun x tsc --noEmit
bun run test
```

## Risks & Open Questions
- Clarify whether additional tool status states (e.g., queued, cancelled) are expected beyond current enum.
- Confirm design assets (icons, copy buttons) align with broader design system expectations.
- Determine if payload truncation limits need configuration per session or globally.
- Validate that downstream consumers of `Part` typings can absorb structural changes without breaking APIs.
