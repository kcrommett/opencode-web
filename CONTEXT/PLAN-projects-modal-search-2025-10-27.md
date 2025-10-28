## Context and Objectives

### Issue Reference
- GitHub issue: [#54 Add project search functionality to Projects modal](https://github.com/opencodehq/opencode-web/issues/54)
- Working branch: `issue-54-add-project-search-functionality-to-projects-modal`
- Request (2025-10-27): produce a comprehensive implementation plan captured in repository context

### Decisions & Constraints Captured
- Search experience is scoped to the Projects modal only; sidebar remains unchanged.
- Reuse Session search patterns (debounce, keyboard shortcuts, styling) to maintain UI consistency.
- Preserve existing keyboard navigation (arrow keys, enter, escape) and current project highlighting.
- Display a clear empty state ("No projects found") when the filtered list is empty.
- Search must support matching against the full `worktree` path, case-insensitive.
- Debounce user input to avoid unnecessary rerenders; align with 300 ms precedent from session search.
- Implementation should avoid introducing new dependencies unless justified.

### Stakeholders & Environment
- Primary stakeholders: product (issue author), frontend maintainers, QA.
- Runtime stack: React + TypeScript + TanStack Start UI conventions.
- Relevant repo location: `/home/shuv/repos/worktrees/opencode-web/issue-54-add-project-search-functionality-to-projects-modal`.
- Tests and linting powered by Bun (`bun run lint`, `bun x tsc --noEmit`, `bun run test`).

## Technical Specifications

### Components and File Mapping
| Component / Asset | Relative Path | Responsibility | Planned Action |
| --- | --- | --- | --- |
| Projects modal | `src/app/_components/ui/project-picker.tsx` | Renders modal shell, current keyboard navigation & project list | Inject search UI, manage filtered list, update navigation logic |
| Session search input (reference) | `src/app/_components/ui/session-search.tsx` | Provides debounced input with keyboard shortcuts | Mirror implementation details for projects |
| UI exports barrel | `src/app/_components/ui/index.ts` | Re-exports UI primitives & composed widgets | Export new `ProjectSearchInput` |
| (New) Project search input | `src/app/_components/ui/project-search.tsx` | Dedicated search control for projects modal | Create component based on session search patterns |
| Input primitive | `src/app/_components/ui/input.tsx` | Base input styling and behaviors | Reuse inside project search input |

### State & Behavior Overview
| Concern | Current Behavior | Target Behavior |
| --- | --- | --- |
| Project collection | Static `projects` array provided via props | Derived `filteredProjects` array recomputed from `searchQuery` |
| Selection index | Tracks highlighted project in original array | Tracks highlighted project in filtered array, defaulting to first result |
| Keyboard handling | Global listener handles arrow, enter, escape | Extend logic to operate on filtered list and avoid index overflows |
| Search string | No search string | Managed via local state & debounced updates per component |

### Keyboard Interaction Requirements
- ArrowUp / ArrowDown cycle through filtered projects without skipping or wrapping unintentionally.
- Enter selects the highlighted project from the filtered collection.
- Escape closes the dialog when focus is outside the search input; inside the search input, it clears the query but leaves modal open.
- Cmd/Ctrl + K focuses the search input from anywhere within the modal context.

### Styling & Theming
- Align colors with existing theme variables used in `SessionSearchInput` (backgroundAlt, foreground, border, etc.).
- Ensure search input width matches modal body width and maintains padding harmony with list items.
- Maintain responsive layout within modal (desktop & mobile) without increasing scroll jitter.

### Data Flow & Filtering Logic
- Local search state inside `ProjectPicker` to store raw query; pass to `ProjectSearchInput` as controlled prop.
- Debounced change callback updates filtered projects; derive filtered collection via `useMemo` to prevent recomputation on unrelated renders.
- Filter condition: `project.worktree.toLowerCase().includes(query.trim().toLowerCase())`.
- When query is empty, fallback to original `projects` array.

### Integration Points & Configuration
| Setting | Value | Rationale |
| --- | --- | --- |
| Debounce delay | `300` milliseconds | Matches session search UX expectations |
| Empty state text | `"No projects found"` | Clear feedback aligning with acceptance criteria |
| Accessibility attributes | `aria-label`, keyboard handlers scoped appropriately | Maintain accessibility parity with session search |

### API & Backend Considerations
- No new network calls or backend endpoints required; filtering is client-side on provided project list.
- Ensure existing project-fetch logic (outside modal scope) continues to deliver complete project array before modal opens.

## Implementation Plan & Tasks

### Milestone 1 – Audit Current Modal Behavior & Data Contracts
- [x] Confirm `ProjectPicker` usage sites to understand prop guarantees and modal lifecycle.
- [x] Document `ProjectItem` shape and ensure it consistently exposes `worktree` for search.
- [x] Capture current keyboard navigation behavior to establish regression baseline.
**Validation**
- Record screen or notes from current modal interactions; ensure arrow, enter, escape events behave as expected.

### Milestone 2 – Build `ProjectSearchInput` Component
- [x] Create `src/app/_components/ui/project-search.tsx` modeled after `SessionSearchInput` with project-specific labels.
- [x] Refactor shared pieces (if necessary) to avoid duplication while preventing premature abstraction.
- [x] Export new component from `src/app/_components/ui/index.ts` for reuse.
**Validation**
- Storybook/manual: render component in isolation (via temporary route or test harness) to verify debounced updates, shortcuts, and clear button.
- Type-check to confirm prop parity with consumer expectations.

### Milestone 3 – Integrate Search into `ProjectPicker`
- [x] Introduce `searchQuery` state and `setSearchQuery` handler managed within `ProjectPicker`.
- [x] Compute `filteredProjects` with memoization and fallback to full list when query is empty.
- [x] Insert `ProjectSearchInput` into modal header section beneath title.
- [x] Display "No projects found" message when `filteredProjects` is empty but original list is non-empty.
**Validation**
- Manual verification inside modal: ensure search input renders properly and empty state appears only when expected.
- Console-check for absence of React key warnings or uncontrolled component errors.

### Milestone 4 – Update Selection & Keyboard Logic
- [x] Adjust arrow key handlers to clamp indices within `filteredProjects.length`.
- [x] Reset `selectedIndex` to `0` whenever `filteredProjects` changes and contains items; set to `-1` when empty to prevent invalid selection.
- [x] Ensure `onSelect` uses project from `filteredProjects[selectedIndex]` and gracefully handles empty case.
- [x] Prevent escape key within input from closing modal by stopping propagation appropriately.
**Validation**
- Manual keyboard walkthrough covering: focus search via Cmd/Ctrl+K, type query, navigate results, clear with Escape, confirm Enter selection.

### Milestone 5 – Polish, QA, and Documentation
- [x] Update any inline comments or README snippets if modal behavior is referenced elsewhere.
- [x] Add or update tests (unit or integration) if feasible for search logic; otherwise, document manual QA steps.
- [x] Smoke-test on narrow viewport to ensure layout stability.
- [x] Run repository checks (`bun run lint`, `bun x tsc --noEmit`, targeted tests) to guarantee compliance.
**Validation**
- Capture QA checklist results; attach screenshots/GIFs for PR description.
- Confirm no regressions reported by automated lint/type/test tasks.

## Overall Implementation Order
1. Baseline current modal behavior (Milestone 1).
2. Build reusable search input component (Milestone 2).
3. Embed search UI and filtering into modal (Milestone 3).
4. Reconcile keyboard controls with new filtered list (Milestone 4).
5. Perform QA, documentation, and project checks (Milestone 5).

## Validation Criteria & QA Checklist
- Search input debounces updates, clears with Escape, and respects Cmd/Ctrl+K focus shortcut.
- Projects list filters case-insensitively using worktree path, preserving original ordering.
- Keyboard navigation operates exclusively on filtered results without skipping or errors.
- Empty state appears only when query yields zero matches and disappears immediately when matches return.
- Enter selects the highlighted project and closes modal; Escape closes modal only when input is not focused.
- Manual responsive check confirms modal layout remains stable on mobile.
- Automated checks:
```bash
bun run lint
bun x tsc --noEmit
bun run test
```

## Code References

### Internal
- `src/app/_components/ui/project-picker.tsx`
- `src/app/_components/ui/project-search.tsx` (new)
- `src/app/_components/ui/session-search.tsx`
- `src/app/_components/ui/index.ts`
- `src/app/_components/ui/input.tsx`

### External
- https://github.com/facebook/react (underlying UI library for hooks and components)

## Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Keyboard listeners conflicting between modal and search input | Could close modal unexpectedly or ignore clearing | Scope key handlers carefully, stop propagation within search input, add regression tests/manual QA |
| Performance degradation on large project lists | Sluggish UI when filtering | Utilize memoization, debounce input, avoid recreating handlers unnecessarily |
| Inconsistent styling between search controls | Visual inconsistency, usability drop | Mirror styling from session search, verify against design tokens |

## Notes & Follow-Ups
- If future requirements demand sidebar search parity, reuse `ProjectSearchInput` component with minimal adjustments.
- Consider extracting shared debounced input hook if another search pattern emerges, but defer until additional use cases appear.
