## Context Overview

### Problem Statement
- GitHub issue #74 identifies two regressions in the slash command picker UX: (1) arrow key navigation fails to auto-scroll the highlighted option into view and (2) navigation halts at the bounds instead of wrapping. Both behaviors break expected command palette ergonomics.
- The picker content (`src/app/_components/ui/command-picker.tsx:12-121`) renders grouped commands inside a scrollable container with `max-h-64 overflow-y-auto`, but no imperative scroll control exists. Keyboard handling resides higher up in `src/app/index.tsx:2412-2568`, where `setSelectedCommandIndex` clamps between 0 and `commandSuggestions.length - 1`.
- Acceptance criteria require smooth scrolling, circular wrapping, preserved highlight styling, and zero regressions to mouse selection or accessibility cues.

### Decisions & Rationale
- Use `Element.scrollIntoView({ block: "nearest", behavior: "smooth" })` inside `CommandPicker` to keep the active row visible; this matches common palette implementations and minimizes custom math.
- Represent picker rows with refs (either one ref array or `data-index` lookups) so the effect can translate `selectedIndex` into a DOM node without querying the entire tree.
- Replace clamped index math with modular arithmetic (`(prev + 1) % listLength`, `(prev - 1 + listLength) % listLength`) to enable circular navigation while remaining resilient to dynamic list sizes.
- Guard all new logic so it no-ops when the picker is hidden or when the command list is empty, preventing unnecessary re-renders or runtime errors.
- Maintain current styling path (CSS variables + `Badge` highlight) to avoid diverging from the design system; only behavior changes are planned.

### Constraints & Considerations
- The picker groups commands by category; the scroll effect must operate on the flattened visual order, not per-category subsets.
- Command source data is typed via `Command` (`src/lib/commands.ts:1-104`); no schema changes are expected, but custom commands may expand categories and lengths.
- Keyboard handling shares logic with mention suggestions and history navigation (`src/app/index.tsx:2442-2560`), so changes must remain scoped to the `showCommandPicker` branch.
- Accessibility: ensure scroll behavior does not steal focus from the textarea; rely on selection styling rather than actual focus movement so screen readers continue narrating the input.

## Technical Specifications

### Components & Data Models
- `CommandPicker` (`src/app/_components/ui/command-picker.tsx`): receives `commands`, `onSelect`, `selectedIndex`. Needs a new ref per item (e.g., `useRef<(HTMLDivElement | null)[]>([])`) plus `useEffect` keyed on `selectedIndex` for scrolling.
- `Command` type (`src/lib/commands.ts`) defines `name`, `description`, optional `args`, and categorical metadata; no modifications required but referenced for typing doc updates.
- `handleKeyDown` (`src/app/index.tsx`): central keyboard dispatcher that sets `selectedCommandIndex` and triggers `handleCommandSelect`. Needs modular index math and optional config constants (e.g., `const wrap = (delta) => ...`).

### Keyboard Interaction Matrix
| Key | Scope | Expected Behavior | Notes |
| --- | --- | --- | --- |
| `ArrowDown` | When `showCommandPicker` is true | Increment index and wrap to 0 when past the last suggestion | Prevent default to keep cursor inside textarea; reuse same logic for mention picker later if desirable |
| `ArrowUp` | When `showCommandPicker` is true | Decrement index and wrap to `commandSuggestions.length - 1` when moving above 0 | Also ensure history navigation path still runs when picker closed |
| `Enter` | Picker open & suggestions available | Executes `handleCommandSelect` using the currently highlighted command | Behavior already correct; ensure scroll effect does not delay selection |
| `Tab` | Picker open | Continues to use selected command; unchanged but should respect new wrapping to keep highlight predictable |

### Scrolling & DOM Refs
- Store the scroll container ref (already `pickerRef`) and either:
  - Track child refs via `const itemRefs = useRef<(HTMLDivElement | null)[]>([])` and assign `ref={(el) => (itemRefs.current[globalIndex] = el)}` on each row, or
  - Query within `pickerRef.current?.querySelector(`[data-command-index="${globalIndex}"]`)` using a stable data attribute.
- `useEffect(() => { itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [selectedIndex, commands.length]);` should guard for undefined refs and optionally skip when `pickerRef.current` is not attached.
- Consider `requestAnimationFrame` wrapping if layout shifts appear; default `smooth` scrolling should be sufficient given short lists.

### API, Data Flow & Integration Points
- No external HTTP APIs are invoked in this feature; interactions stay within React state and helpers.
- Relevant internal callbacks:
  - `handleCommandSelect` (`src/app/index.tsx`) sends the command through existing command execution logic.
  - `completeCommand` (`src/lib/commands.ts`) is unaffected but benefits indirectly from consistent highlighting.
  - `PICKER_COMMANDS` / `NO_ARG_COMMANDS` constants (same file or nearby) continue to dictate immediate execution—ensure their flows still read `selectedCommandIndex`.
- Configuration touches limited to React state; no changes to `.env`, router, or OpenCode SDK endpoints required.

### Configuration Reference
| Setting | Location | Purpose | Notes |
| --- | --- | --- | --- |
| `max-h-64 overflow-y-auto` | `command-picker.tsx` container class | Defines scrollable area | Keep as-is; smooth scrolling rides on this container |
| Theme CSS variables (`--theme-primary`, etc.) | Global tokens (`src/app/globals.css`) | Provide visual contrast for selected rows | Ensure scroll effect keeps highlight visible but makes no color changes |
| Keyboard shortcut registration | `src/hooks/useKeyboardShortcuts.ts` (indirect) | Higher-level shortcut orchestration | No modifications planned, but QA should ensure shortcuts still register correctly |

## Actionable Task Breakdown (with Checkboxes)

### Milestone 1 — Picker DOM Instrumentation
- [ ] Audit `CommandPicker` render tree to confirm stable ordering and unique keys per command.
- [ ] Introduce item-level refs or data attributes that map `selectedIndex` to the rendered DOM node.
- [ ] Add `useEffect` that scrolls the active node into view with `{ block: "nearest", behavior: "smooth" }` while guarding against null refs and hidden pickers.
- [ ] Manually verify that mouse hover styles remain intact when refs are attached.

### Milestone 2 — Circular Keyboard Navigation Logic
- [ ] Refactor the `setSelectedCommandIndex` updater inside the `ArrowDown` handler to `setSelectedCommandIndex((prev) => (prev + 1) % commandSuggestions.length)` when the picker is visible.
- [ ] Mirror the change for `ArrowUp` using `((prev - 1 + commandSuggestions.length) % commandSuggestions.length)` to wrap backwards.
- [ ] Ensure mention suggestion navigation retains prior clamped behavior (future refactor optional) and that history navigation still triggers when the picker is closed.
- [ ] Write inline comments summarizing the wrapping strategy so future contributors understand the modulo math at a glance.

### Milestone 3 — QA, Accessibility, and Regression Guardrails
- [ ] Confirm the highlighted row always stays within the scroll viewport across command list lengths (short, long, custom categories).
- [ ] Smoke-test mouse interactions (hover + click) to ensure pointer events are unaffected by refs and effects.
- [ ] Validate that text input focus never leaves the textarea while navigating commands.
- [ ] Exercise the feature on both desktop and mobile breakpoints (especially smaller heights) to ensure smooth scrolling feels natural.
- [ ] Run automated checks (`bun run lint`, `bun x tsc --noEmit`, `bun run test`) and document outcomes in the eventual PR description.

## Implementation Order & Milestones
1. **Milestone 1 (instrumentation)** must complete first to provide the DOM hooks needed for scrolling; this only touches `CommandPicker` internals.
2. **Milestone 2 (keyboard math)** depends on Milestone 1 for end-to-end UX verification but can be coded in parallel once the ref strategy is agreed upon.
3. **Milestone 3 (QA & validation)** runs after both earlier milestones land; it spans manual testing plus automated lint/type/test checks.
4. Optional follow-up: consider abstracting shared navigation logic for mention suggestions once command picker changes are stable.

## Validation Criteria
- [ ] Scrolling: With >8 commands, pressing `ArrowDown` repeatedly keeps the highlighted row visible without abrupt jumps.
- [ ] Wrapping: From the last command, another `ArrowDown` selects the first entry; from the first command, `ArrowUp` selects the last.
- [ ] Visual state: Highlight, badge indicator, and category headers remain styled exactly as before (compare screenshots if needed).
- [ ] Mouse UX: Hover + click selection still works and does not trigger unintended scrolling.
- [ ] Mobile: Narrow viewport (≤768px) shows consistent behavior when the software keyboard is visible.
- [ ] Automation: `bun run lint`, `bun x tsc --noEmit`, and `bun run test` pass locally.

```bash
bun run lint
bun x tsc --noEmit
bun run test
```

## Code References
### Internal
- `src/app/_components/ui/command-picker.tsx:12-121` — Picker rendering, mouse handlers, and container ref needing scroll logic.
- `src/app/index.tsx:2412-2560` — `handleKeyDown` implementation controlling keyboard navigation and execution.
- `src/lib/commands.ts:1-104` — `Command` model definitions powering the picker contents.

### External
- https://github.com/microsoft/vscode — Reference for VS Code command palette behavior (smooth scroll + wrapping).
- https://github.com/raycast/extensions — Raycast extensions repo demonstrating polished command palette UX patterns.
- https://github.com/slackhq/desktop — Slack desktop client source illustrating circular command picker navigation.

## Risks & Follow-ups
- Smooth scrolling may behave differently across browsers; be prepared to fall back to instant scrolling if QA uncovers jitter on older Chromium builds.
- Long-term consideration: deduplicate keyboard navigation logic shared between command and mention pickers to reduce divergence.
- If future performance profiling shows large custom command sets, consider virtualization, but current scope treats list sizes as modest.
