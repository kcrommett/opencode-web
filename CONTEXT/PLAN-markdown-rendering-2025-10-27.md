## Overview

### Goal
- Deliver a sequenced, implementation-ready approach for GitHub issue #51 (Implement Markdown Rendering) covering UI integration, parsing, sanitization, and validation within the OpenCode Web app.

### Success Metrics
- Markdown (headings, emphasis, lists, tables, blockquotes) renders correctly in assistant and user messages without XSS regressions.
- Inline and fenced code blocks render with language-aware syntax highlighting and fallback styles.
- Regression suite (lint, typecheck, smoke tests) remains green and new tests/assertions cover Markdown scenarios.
- Documentation and configuration updates keep platform stakeholders aligned on feature behavior and rollout.

## Context and Decisions

### Source Inputs
- User request (2025-10-27) to produce a comprehensive execution plan for markdown rendering.
- Existing message rendering pipeline uses `src/app/_components/message/TextPart.tsx` with plain text and manual code block styling.
- Highlight.js utility already centralized in `src/lib/highlight.ts`.
- HTTP interactions for message retrieval/live updates handled through `src/lib/opencode-http-api.ts` and SSE integrations (see `src/lib/opencode-events.ts`).

### Key Decisions & Rationale
- Use a React-compatible Markdown renderer (preferred: [`react-markdown`](https://github.com/remarkjs/react-markdown)) with the remark/rehype pipeline to minimize bespoke parsing.
- Enable GitHub-flavored Markdown (GFM) for parity with typical assistant outputs via [`remark-gfm`](https://github.com/remarkjs/remark-gfm).
- Sanitize rendered HTML with [`rehype-sanitize`](https://github.com/rehypejs/rehype-sanitize`) using a tailored schema to allow code blocks, tables, inline styles tied to our design tokens, and safe links.
- Reuse `highlight.js` integration by bridging markdown AST code nodes to the existing `highlightCode` helper to honor existing themes and future extension.
- Implement a feature flag (config key `features.enableMarkdown`) to support progressive rollout and quick rollback.
- Extend smoke tests and add fixture-driven rendering tests using TanStack Start testing utilities (Cypress/Playwright optional) to ensure deterministic behavior.

### Constraints & Assumptions
- No server-side markdown rendering; feature must run client-side for both SSR hydration and runtime message streaming.
- SSE streaming should progressively render Markdown parts without blocking on complete message arrival.
- Styling should align with existing typography and theming tokens defined in `src/app/globals.css` and component primitives under `src/app/_components/ui`.
- Assume Bun toolchain (per project guidelines) with `bun` scripts for install/build/test.

## Technical Specifications

### Rendering Pipeline Enhancements
- `src/app/_components/message/TextPart.tsx`: Replace `Pre` wrapper with Markdown-aware component that defers to `react-markdown` while preserving current differentiation between plain text and code-rich content.
- `src/app/_components/ui/pre.tsx`: Ensure general-purpose code presentation component can be reused for fenced blocks emitted by Markdown.
- `src/app/_components/message/MessagePart.tsx`: Confirm conditional rendering continues to route `text` parts to the enhanced Markdown renderer without affecting other part types.
- `src/lib/highlight.ts`: Export helper to map `react-markdown` code nodes (language hints via `info` strings) through `highlightCode`, falling back to plaintext when detection fails.
- `src/types/opencode.ts`: Clarify `Part` typing for `text` payloads (ensure optional fields for Markdown metadata if added later).

### Markdown Parsing & Sanitization
- Leverage `remark-parse` and `remark-gfm` plugins to interpret headings, tables, task lists, and strikethrough.
- Include `rehype-raw` **only if** trusted HTML input is necessary; otherwise keep disabled to avoid raw HTML injection.
- Apply `rehype-sanitize` with schema allowing `<code>`, `<pre>`, `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>`, `<th>`, `<blockquote>`, `<a>` (with `rel="noreferrer noopener"`), `<img>` (optional; gate via config), and typography tags.
- Provide custom component overrides within `react-markdown` to map `code`, `blockquote`, `a`, `table`, and `li` elements to shadcn/TanStack primitives for consistent styling and accessibility.

### Code Highlighting Strategy
- Maintain highlight.js registrations in `src/lib/highlight.ts`; extend mapping to prefer language hints from code block "info" strings.
- Introduce utility `src/lib/markdown.ts` with helper `renderCodeBlock(code: string, language?: string)` invoking `highlightCode` and injecting safe HTML via `dangerouslySetInnerHTML` within sanitized context.
- Confirm CSS class hooks align with existing theme tokens (`.hljs`, `.line-number`) from `src/app/globals.css`.

### UI & Styling Integration Points
- Shared typography tokens live in `src/app/_components/ui` (e.g., `pre.tsx`, `badge.tsx`); ensure Markdown output uses these primitives.
- Update responsive behavior to respect mobile constraints handled in `src/app/_components/ui/responsive-dialog.tsx` and `src/app/globals.css` breakpoints.
- Add dark/light theme verifications against `src/lib/themes.ts` definitions.

### API Endpoints Touching Markdown Data
- `GET /session/{sessionId}/message` (`src/lib/opencode-http-api.ts:108`) provides message parts containing raw `text` strings.
- `POST /session/{sessionId}/message` (`src/lib/opencode-http-api.ts:138`) accepts user-authored Markdown (plain text body) that will later render via the same pipeline.
- SSE streaming events dispatched via `src/lib/opencode-events.ts` (stream path `/session/{sessionId}/events`) must stream partial Markdown fragments safely; ensure incremental rendering does not cause flicker.

### Data Model Touchpoints
- `Part` type (`src/types/opencode.ts:1`) describes message segments; ensure `text` parts remain backward compatible (no schema change required unless storing Markdown metadata).
- Potential addition: optional discriminated union `MarkdownPart` if future server updates emit pre-parsed structures; keep plan scoped to current `text` type.

### Configuration & Feature Flags

| Config key | Location | Default | Notes |
|------------|----------|---------|-------|
| `features.enableMarkdown` | `src/lib/config.ts` (new entry) & persisted via `opencode.config.*` | `false` | Toggle to enable Markdown rendering once feature ready; fallback to plain text when disabled. |
| `features.enableMarkdownImages` | `src/lib/config.ts` (optional) | `false` | Controls whether `<img>` tags render; tie to sanitization schema. |
| `VITE_OPENCODE_SERVER_URL` | `.env`, `.env.example` | `http://localhost:4096` | Ensure no change; listed for completeness during testing of streamed messages. |

### External Dependencies
- Add `react-markdown@^9`, `remark-gfm@^4`, `rehype-sanitize@^6` to `package.json` under `packages/opencode-web/package.json` and root if required.
- Evaluate optional `rehype-highlight` but prefer custom integration with `highlightCode` for consistent styling.

## Actionable Implementation Plan

### Milestone 0 – Discovery & Setup
- [x] Review GitHub issue #51 discussion/comments for additional acceptance criteria.
- [x] Validate no existing Markdown renderer is bundled (search `react-markdown` or `remark` across repo using `rg`).
- [x] Align with design on typography expectations (confer with design tokens in `docs/screenshots/` for parity).

### Milestone 1 – Markdown Rendering Foundation
- [x] Introduce Markdown utility module `src/lib/markdown.tsx` encapsulating parser, sanitizer, and highlight bridging.
- [x] Install dependencies (`react-markdown`, `remark-gfm`, `rehype-sanitize`) within root `package.json` and update lockfiles via `bun install`.
- [x] Update `src/app/_components/message/TextPart.tsx` to render Markdown using the new utility while preserving feature flag fallback.
- [x] Add unit-level tests (using Bun test) covering headings, emphasis, lists, links, and inline code detection.

### Milestone 2 – Enhanced Code & Media Handling
- [x] Wire fenced code blocks to `highlightCode` with graceful fallback; ensure SSR and hydration safe `dangerouslySetInnerHTML` usage.
- [x] Implement copy-to-clipboard affordance with visual feedback for code fences.
- [x] Add optional image rendering path gated by `features.enableMarkdownImages`; ensure sanitized `src` and `alt` attributes.
- [x] Verify table rendering via responsive wrappers (use `overflow-x-auto` styling for horizontal scrolling).

### Milestone 3 – Streaming, QA & Documentation
- [x] Confirm streaming updates integrate with Markdown parser without double-render using React re-rendering on text updates.
- [ ] Add story/demo to component examples (`src/app/_components/ui/component-examples.tsx`) showcasing Markdown-rich message.
- [x] Update documentation (`CONTEXT/PLAN-markdown-rendering-2025-10-27.md`) summarizing Markdown support implementation.
- [x] Run validation suite:
  - [x] `bun run lint` - PASSED
  - [x] `bun x tsc --noEmit` - PASSED (excluding pre-existing errors)
  - [x] `bun run test` - PASSED (24 tests passing)
  - [x] `bun run build` - PASSED

### Milestone 4 – Rollout & Monitoring
- [ ] Update feature flag defaults (enable in staging) via config management in `src/lib/config.ts`.
- [ ] Coordinate release notes (`.github/workflows/release.yml` references) highlighting Markdown support.
- [ ] Monitor telemetry/logs for rendering errors (consider capturing in `console.error` intercepts guarded by env checks).
- [ ] Remove feature flag once stable and backfill documentation to mark completion.

## Implementation Order & Dependencies
1. Complete Milestone 0 discovery to ensure no conflicting efforts and gather missing requirements.
2. Execute Milestone 1 tasks sequentially: dependency install → utility module creation → component integration → baseline tests.
3. Proceed to Milestone 2 once baseline rendering validated to expand code/media support.
4. Milestone 3 handles streaming compatibility and regression validation; must pass prior to rollout.
5. Milestone 4 (rollout) depends on successful QA and stakeholder sign-off.

## Validation Criteria
- Unit & integration tests cover Markdown fixtures (headings, nested lists, tables, checklists, fenced code with language hints, bare code fences, inline code).
- Visual QA across desktop/mobile breakpoints to ensure tables scroll horizontally and long code blocks remain readable.
- Feature flag toggling to confirm fallback plain text path remains intact.
- Security review ensuring sanitizer schema blocks script injection and data URLs unless explicitly allowed.

```bash
bun run lint
bun x tsc --noEmit
bun run test
bun run build
```

## External References
- React Markdown – https://github.com/remarkjs/react-markdown
- Remark GFM – https://github.com/remarkjs/remark-gfm
- Rehype Sanitize – https://github.com/rehypejs/rehype-sanitize
- Highlight.js – https://github.com/highlightjs/highlight.js

## Risks & Mitigations
- **XSS vulnerabilities**: Keep `rehype-raw` disabled; maintain strict sanitize schema; add regression tests for malicious input.
- **Performance impacts**: Pre-compute sanitizer/renderer instances; memoize Markdown rendering per-part to avoid re-parsing large transcripts.
- **Streaming glitches**: Guard parser invocation until message chunk boundaries stable; consider debounced rendering for rapid SSE bursts.
- **Hydration mismatches**: Ensure deterministic output by using identical parser configuration for SSR and client.

## Next Steps After Plan Approval
- Secure stakeholder sign-off on feature flags and rollout schedule.
- Begin Milestone 0 tasks; convert completed checklist items to tracking issue/PR updates.
