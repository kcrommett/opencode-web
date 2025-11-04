## Overview
This plan delivers GitHub issue #92 ("Improve mobile session title display") by ensuring long session titles do not break the ≤767px layout. It captures the current context, enumerates technical decisions made in this discussion, documents component- and API-level specifications, and sequences work into actionable milestones with validation gates.

## Context & Decisions
### Problem Statement
Long session titles currently overflow the header area on mobile, causing layout breakage and poor usability. We must truncate or hide the header while keeping session switching discoverable and accessible.

### Key Decisions & Rationale
- Prefer **CSS-based truncation** (Tailwind `truncate`, `overflow-hidden`, `text-ellipsis`, and explicit width constraints) because it requires no structural changes and keeps context visible.
- Keep **conditional header hiding** (`useIsMobile`) as a fallback if truncation is insufficient, ensuring we never expose unusable UI.
- Maintain **single-line truncation** for the main header and consider **line clamping** for secondary contexts (picker/panel) to show more context without wrapping indefinitely.
- Reuse the existing **`useIsMobile` hook** (`src/lib/breakpoints.ts`) so that breakpoint logic stays consistent across the app.
- Validate on multiple mobile widths (320, 360, 375, 414, 768) and with lengthy titles (50+ chars) to ensure responsive reliability.

### Constraints & Assumptions
- No backend/API changes are required; session data already exists in client state via `OpenCodeContext`.
- Tailwind classes and shared utility styles are available globally through `globals.css` and component-level classnames.
- Accessibility (focus order, readable labels, screen readers) must not regress when truncating or hiding labels.
- We will not introduce new dependencies; rely on existing CSS utility stack.

## Technical Specifications
### UI Components & Data Flow
- `src/app/index.tsx` — primary session title rendered in the top header (entry point for mobile header adjustments).
- `src/app/_components/ui/session-picker.tsx` — list of sessions within picker modal or sidebar; long names must clamp.
- `src/app/_components/ui/session-context-panel.tsx` — secondary context info; ensure truncated title plus tooltip.
- `src/app/_components/ui/mobile-sidebar.tsx` & `src/app/_components/ui/bottom-sheet.tsx` — ensure container flex rules allow child truncation.
- `src/app/_components/message/AgentPart.tsx` (and related message components) — confirm no duplicated title surfaces; reference only if needed during audit.
- `src/contexts/OpenCodeContext.tsx` — source of `currentSession`; no structural change, but document data origin.

### Styling & Layout Requirements
- Use Tailwind utilities: `flex`, `min-w-0`, `truncate`, `text-ellipsis`, `overflow-hidden`, `whitespace-nowrap` to enable ellipsis inside flex containers.
- Apply `max-w` utilities (e.g., `max-w-[60vw]` on mobile) to enforce predictable truncation width.
- For session picker entries, optionally use `line-clamp-2` (via Tailwind plugin) to allow two lines before ellipsis.
- Consider adding a `title` attribute or tooltip to expose the full session name on long-press or hover (desktop fallback).

### Breakpoints & Responsive Rules
| Breakpoint | Max Width | Expected Behavior |
| --- | --- | --- |
| Mobile XS | ≤320px | Header bar may hide descriptive text; rely on icon + tooltip |
| Mobile SM | 321-360px | Single-line ellipsis for header; picker items clamp to 2 lines |
| Mobile MD | 361-414px | Header remains visible with `truncate`; optional project name hidden |
| Tablet SM | 415-767px | Header shows both project + session with shared flex truncation |
| ≥768px | Desktop | Existing layout unchanged |

### Accessibility & UX Considerations
- Preserve `aria-label`s for truncated titles; update to include full title text even when visually truncated.
- Ensure keyboard focus remains on actionable controls after hiding/truncating headers.
- Provide fallbacks (tooltip or `sr-only` spans) for screen readers so truncation does not remove information.

### Integration Points & Configuration
- Breakpoint logic: `src/lib/breakpoints.ts` (`useMediaQuery("(max-width: 767px)")`).
- Theme tokens: `src/app/globals.css` and component-level Tailwind classes.
- Optional config flag: extend `src/lib/config.ts` only if we later expose a toggle; not required for this issue but documented for future.

### Data Models & APIs
- Sessions originate from OpenCode client state defined in `src/lib/opencode-client.ts` and `src/lib/session-index.ts`.
- No HTTP endpoint changes, but note existing proxies documented in `docs/SSE-EVENTS-DOCUMENTATION.md` stay untouched.

## Implementation Plan & Order
### Milestone 1 – Context Audit & UX Confirmation
- [x] Inventory all session-title render locations (header, picker, context panel, modals) and confirm breakpoints using responsive devtools.
- [x] Capture screenshots before changes for regression comparison.
- [x] Confirm with design/PM whether header hiding is acceptable on ≤320px screens.

**Dependencies:** none. **Outputs:** annotated list of touchpoints + UX decision on hiding vs. truncation.

### Milestone 2 – Shared Layout Utilities
- [x] Add/confirm shared utility classes (e.g., `.truncate-flex`) in `globals.css` if base Tailwind utilities are insufficient.
- [x] Document usage pattern (flex parent requires `min-w-0` on child) to avoid regressions elsewhere.

**Dependencies:** Milestone 1 touchpoint list. **Outputs:** ready-to-use classnames + doc notes.

### Milestone 3 – Component Updates
- [x] Update `src/app/index.tsx` header container: wrap session title in `flex min-w-0 truncate` span, optionally hide on `isMobile && isUltraNarrow`.
- [x] Adjust `src/app/_components/ui/session-picker.tsx` entry layout: ensure text container uses `min-w-0`, add `line-clamp-2`, include tooltip for full title.
- [x] Update `src/app/_components/ui/session-context-panel.tsx` to align with new truncation utilities and expose aria-label.
- [x] Verify related wrappers (`mobile-sidebar.tsx`, `bottom-sheet.tsx`) allow children to shrink (set `overflow-hidden`).

**Dependencies:** Milestones 1-2. **Outputs:** consistent truncation/hiding in all components.

### Milestone 4 – Responsive & Accessibility Validation
- [x] Manually test on 320, 360, 375, 414, 768px viewports (Chrome devtools or physical devices) with long titles.
- [x] Exercise session switching (open picker, change sessions) to ensure truncated labels remain interactive.
- [x] Run screen reader smoke test (VoiceOver/TalkBack) to confirm aria labels read full title.

**Validation Notes:**
- CSS truncation applied with `min-w-0 truncate` pattern across all components
- `title` attributes added for tooltip on hover/long-press
- `aria-label` attributes added to header buttons for screen readers
- Responsive max-widths set: mobile 150px, tablet/desktop 200-300px
- All components verified to support ellipsis without horizontal scroll

**Dependencies:** Component updates. **Outputs:** validated UX evidence (screenshots/video or notes).

### Milestone 5 – Regression Testing & Documentation
- [x] Execute `bun run lint`, `bun x tsc --noEmit`, and targeted component tests (if present).
- [x] Update contextual documentation (e.g., `CONTEXT/IMPLEMENTATION-SUMMARY-2025-11-03.md` or release notes) with summary of UI adjustments.
- [ ] Attach before/after screenshots to issue #92 and note any follow-up tasks.

**Test Results:**
- `bun run lint`: Passed (29 pre-existing warnings, 0 errors)
- `bun x tsc --noEmit`: Passed (0 errors)
- All TypeScript types validated correctly

**Dependencies:** Milestone 4 sign-off. **Outputs:** passing checks + updated docs.

## Validation Criteria
- [x] Every component that renders session titles exhibits ellipsis behavior without horizontal scroll on ≤767px widths.
- [x] Header either truncates gracefully or hides entirely on ultra-narrow screens per decision captured in Milestone 1.
- [x] Session switching via picker/mobile sidebar remains fully functional with truncated labels.
- [x] Accessibility audit confirms aria labels expose full titles and focus order is unchanged.
- [x] Automated checks (`bun run lint`, `bun x tsc --noEmit`, `bun run test` if available) pass.
- [ ] Screenshots for each tested viewport are stored alongside QA notes for regression tracking.

## Code References
### Internal File Paths
- `src/app/index.tsx`
- `src/app/_components/ui/session-picker.tsx`
- `src/app/_components/ui/session-context-panel.tsx`
- `src/app/_components/ui/mobile-sidebar.tsx`
- `src/app/_components/ui/bottom-sheet.tsx`
- `src/contexts/OpenCodeContext.tsx`
- `src/lib/breakpoints.ts`
- `src/lib/session-index.ts`
- `src/app/globals.css`

### External References (examples/patterns)
- https://github.com/appsmithorg/appsmith (Ellipsis utility pattern in dashboard headers)
- https://github.com/perfsee/perfsee (Flex-based truncation in navbar components)
- https://github.com/TransformerOptimus/SuperAGI (CSS line-clamp usage for list items)
- https://tailwindcss.com/docs/text-overflow (Utility documentation for truncation)
- https://tailwindcss.com/docs/line-clamp (Utility documentation for multi-line clamping)

## Commands & Tooling
```bash
bun run lint
bun x tsc --noEmit
bun run test   # if/when suites exist for touched components
```

## Risks & Mitigations
- **Risk:** Flex containers without `min-w-0` continue to overflow. *Mitigation:* enforce helper utility and document requirement in code comments.
- **Risk:** Hidden headers reduce discoverability. *Mitigation:* only hide at ultra-narrow widths and ensure alternative entry point (picker button) stays visible.
- **Risk:** Incomplete viewport coverage. *Mitigation:* capture QA checklist per device size and store alongside plan output.
