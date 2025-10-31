## Overview
- Replace the Markdown code block header/copy button with a click-to-copy interaction applied directly to the block while maintaining highlight.js integration.
- Deliver a lighter UX that keeps code blocks inline with surrounding markdown by providing subtle feedback states instead of a persistent header.
- Verify desktop and mobile parity, clipboard API fallbacks, and regression safety for the Markdown rendering entry points defined in issue #91.

## Context Capture
### Problem Statement
- GitHub issue #91 requires removing the code block header because it adds visual clutter and breaks markdown flow. Copy interactions must be preserved via a click-to-copy experience that occupies no extra vertical space.
- The new interaction must feel intuitive, give subtle confirmation, and remain reliable across browsers, including touch devices where long-press/selection conflicts must be avoided.

### Current Implementation
- The custom `CodeBlock` in `src/lib/markdown.tsx:21` renders a wrapper `<div>` with a header containing a language label and a `Copy` button. Copying relies on `navigator.clipboard.writeText()` and toggles a `copied` state to flip the button label.
- Syntax highlighting is produced by `highlightCode` (`src/lib/highlight.ts:38`), which returns HTML for insertion into `<code>` via `dangerouslySetInnerHTML`.
- CSS in `src/app/globals.css:605` defines baseline `.hljs` and line-number styles but no states for click feedback or cursor changes.
- Existing markdown tests (`tests/markdown.test.ts:1`) only cover syntax detection, so there is no automated regression guard for the rendered markup.

### Desired Outcomes & Constraints
- Header must be removed while retaining language detection for styling (can leverage `className` / data attributes on `<pre>` or `<code>`).
- Entire block (and keyboard equivalent) should trigger copying. Provide clear visual affordance without permanently altering layout.
- Visual feedback should be brief and subtle (e.g., soft highlight flash, temporary border/color change). Avoid pop-ups or toasts.
- Maintain compatibility when clipboard API is unavailable; fall back gracefully without throwing in production. Avoid noisy logging unless `NODE_ENV !== "production"`.
- Ensure focus management and accessibility: keyboard users should be able to trigger copy and receive the same feedback.

### Reference Patterns
- VS Code’s clipboard service guards `navigator.clipboard` access and logs errors quietly (`https://github.com/microsoft/vscode/blob/main/src/vs/platform/clipboard/browser/clipboardService.ts#L140`).
- Excalidraw uses async clipboard writes with fallbacks and silent error handling (`https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/clipboard.ts#L594`).
- The `copy-text-to-clipboard` utility demonstrates DOM-based fallbacks for environments without async clipboard support (`https://github.com/sindresorhus/copy-text-to-clipboard/blob/main/index.js#L1`).

## Task Breakdown
### Discovery & Alignment
- [x] Confirm expected hover/active states and timing with design/product references for issue #91 (screenshots or existing desktop builds).
- [x] Audit the Markdown render pipeline to ensure no other component wraps `<pre>` elements that might conflict with new event handlers.
- [x] Inventory any global CSS selectors that target `.markdown-content pre` to avoid regressions when modifying styles.

### Component Refactor
- [x] Remove the header `<div>` and `Copy` button markup from `CodeBlock`, keeping only the wrapper, `<pre>`, and `<code>` elements.
- [x] Refactor `handleCopy` to live inside `useCallback`, reuse existing `copied` state, and attach it to `<pre>` (and optionally `<code>` for redundancy).
- [x] Add a keyboard handler (`onKeyDown`) that triggers the copy logic on `Enter`/`Space` for accessibility.
- [x] Introduce a timeout ref so copy feedback resets without stacking timers when users click rapidly.

### Styling & Visual Feedback
- [x] Apply `cursor: pointer`, `transition`, and `focus-visible` outlines to the code block via CSS additions in `src/app/globals.css`.
- [x] Toggle a `data-copied="true"` attribute (or similar) to drive temporary background/border changes using CSS keyframes or transitions.
- [x] Preserve padding, border radius, and scrollability when the header is removed, ensuring the block still matches surrounding WebTUI aesthetics.
- [x] Document the styling tokens (e.g., `--theme-primary`, `--theme-backgroundAccent`) used for flash states to keep them theme-aware.

### Accessibility & Fallbacks
- [x] Set `role="button"`, `tabIndex={0}`, `aria-label` (with language context), and a `title` tooltip indicating "Click to copy".
- [x] Implement a fallback path that, when async clipboard fails, optionally leverages a hidden `<textarea>` (inspired by `copy-text-to-clipboard`) without disrupting focus.
- [x] Ensure `copied` state also sets `aria-live="polite"` feedback (e.g., visually hidden confirmation) if required by accessibility review.

### Testing & QA
- [x] Extend `tests/markdown.test.ts` or add a new test to cover rendering of code blocks (can snapshot HTML or simulate the component with JSDOM).
- [x] Add unit tests around the copy handler by mocking `navigator.clipboard.writeText` and verifying fallback execution paths.
- [x] Run `bun run lint`, `bun x tsc --noEmit`, and `bun run test` to confirm no regressions across linting, type checks, and existing test suites.
- [ ] Perform manual QA: verify copy feedback on Chrome, Firefox, and Safari (including iOS). Confirm long-press on touch does not break the copy experience.
- [ ] Validate that selecting text manually still works (drag-to-select should not immediately override with full-block copy unless the click is released without selection).

### Documentation & Handoff
- [x] Update any internal UI documentation (e.g., screenshots or `docs/` assets) if the visual change needs to be communicated.
- [x] Draft release notes or changelog entry summarizing the UX adjustment and rationale.
- [x] Capture follow-up tickets if broader Markdown styling revisions are revealed during the change.

## Technical Specifications
### Clipboard Interaction Contract
- Use `useCallback` + `useRef` for the copy handler and timer management to prevent stale closures.
- Guard `navigator.clipboard.writeText` in a try/catch; only log errors when `NODE_ENV !== "production"`.
- Provide a fallback that invokes a lazily created `<textarea>` element (scoped to the component) when the async clipboard API is unavailable.

```tsx
const handleCopy = useCallback(async () => {
  if (!code) return;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(code);
    } else {
      fallbackCopy(code); // inject hidden textarea strategy
    }
    setCopyState("copied");
    resetTimerRef.current?.();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Copy failed", error);
    }
    setCopyState("error");
  }
}, [code]);
```

### Visual Feedback Treatments

| Trigger | Feedback | Duration | Implementation Notes |
| --- | --- | --- | --- |
| Hover/focus | Lighten background + show pointer cursor | Persistent while state active | CSS `:hover`, `:focus-visible` states in `src/app/globals.css` |
| Successful copy | Flash primary-tinted overlay, optional `Copied!` badge fade | ~1.5s then revert | Toggle `data-copied` + CSS transition; reuse `copied` state |
| Error fallback | Subtle warning border tint | Until next interaction | Set `data-copy-status="error"` to style via theme warning colors |

### Accessibility Requirements
- `role="button"` and `tabIndex={0}` on `<pre>` ensure keyboard focusability.
- `aria-label={`Copy ${language || "code"} block to clipboard`}` communicates intent; pair with a `title` attribute for hover hints.
- Provide keyboard support (`Enter`, `Space`) and ensure `preventDefault` only when copy succeeds to avoid blocking normal text selection shortcuts.
- Optionally include a visually hidden `<span aria-live="polite">Copied</span>` that toggles with `copied` state for screen readers.

### Styling Hooks & Data Attributes
- Add `data-language={language}` to `<pre>` to keep language context available for future theming.
- Apply `data-copy-status` values (`idle`, `copied`, `error`) to drive CSS selectors instead of toggling many classes.
- Extend `.hljs` styles in `src/app/globals.css:605` with new rules:

```css
.markdown-content pre[data-copy-status] {
  position: relative;
  transition: background-color 120ms ease, border-color 120ms ease;
}
.markdown-content pre[data-copy-status="copied"] {
  background-color: rgb(from var(--theme-primary) r g b / 0.1);
  border-color: var(--theme-primary);
}
```

### Mobile & Touch Considerations
- Use `onPointerUp` or `onTouchEnd` listeners if needed so a tap triggers copy after the pointer sequence ends, reducing accidental triggers during scroll.
- Prevent the fallback `<textarea>` from shifting focus permanently on mobile (return focus to the code block once copy completes).
- Confirm the block remains horizontally scrollable when content overflows (maintain `overflow-x-auto`).

## Code References
### Internal
- `src/lib/markdown.tsx:21` – `CodeBlock` component to refactor (remove header, add new interaction).
- `src/lib/highlight.ts:38` – `highlightCode` helper; ensure its output remains unchanged by the refactor.
- `src/app/globals.css:605` – `.hljs` block styling; extend with hover/copy feedback rules.
- `src/app/_components/ui/pre.tsx:22` – Reusable `<Pre>` wrapper using WebTUI attributes; mirror padding/shape where relevant.
- `tests/markdown.test.ts:1` – Existing markdown unit tests; extend to cover code block rendering if feasible.

### External
- `https://github.com/microsoft/vscode/blob/main/src/vs/platform/clipboard/browser/clipboardService.ts#L140` – Guarded async clipboard implementation reference.
- `https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/clipboard.ts#L594` – Clipboard fallback strategy used in production UI.
- `https://github.com/sindresorhus/copy-text-to-clipboard/blob/main/index.js#L1` – DOM-based copy fallback for environments lacking async clipboard support.

## Implementation Order
1. **Milestone A – Alignment & Audits**  
   Dependencies: none.  
   Completion criteria: Discovery checklist complete, UX decisions documented, no conflicting CSS selectors outstanding.
2. **Milestone B – Component Refactor**  
   Depends on Milestone A.  
   Completion criteria: Header removed, copy handler attached to `<pre>`, keyboard support implemented, TypeScript builds locally.
3. **Milestone C – Styling & Feedback**  
   Depends on Milestone B.  
   Completion criteria: New CSS states in place, `data-copy-status` wiring functional, visual QA screenshots captured.
4. **Milestone D – Fallbacks & Accessibility**  
   Depends on Milestone C.  
   Completion criteria: Fallback copy path verified, accessibility attributes validated via manual keyboard audit.
5. **Milestone E – Validation & Documentation**  
   Depends on Milestone D.  
   Completion criteria: Automated commands (`bun run lint`, `bun x tsc --noEmit`, `bun run test`) pass, manual browser/mobile checks signed off, release notes drafted.

## Validation Criteria
### Automated
- `bun run lint` reports no lint regressions.
- `bun x tsc --noEmit` passes to confirm new hooks/refs are typed correctly.
- `bun run test` includes updated markdown tests covering the click-to-copy markup.

### Manual Experience
- Clicking the code block copies the full snippet and flashes feedback within 1.5s on Chrome, Firefox, Safari (desktop) plus Safari/Chrome on iOS/Android.
- Keyboard focus (Tab) plus `Enter`/`Space` triggers the same copy feedback without scroll jumps.
- Touch interactions trigger copy on tap without blocking horizontal scroll or text selection gestures.

### Regression Watch
- Syntax highlighting output (language tokens, line numbers) matches pre-change behavior when comparing rendered DOM before/after.
- Copy still succeeds when async clipboard API is unavailable (simulate by stubbing `navigator.clipboard` to `undefined`).
- No residual DOM from the old header remains; surrounding markdown spacing (margins, grouping) aligns with neighboring elements.
