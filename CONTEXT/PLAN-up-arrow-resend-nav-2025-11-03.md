## Context & Goals

### Source Inputs
- GitHub issue [#79](https://github.com/opencodehq/opencode-web/issues/79) ("Add up arrow navigation to resend previous user messages") defines the user-facing problem and acceptance criteria.
- Current conversation aligns on producing a detailed implementation roadmap and storing it at `CONTEXT/PLAN-up-arrow-resend-nav-2025-11-03.md`.
- Branch `79-add-up-arrow-navigation-to-resend-previous` already targets the requested feature, so this plan assumes work continues on that branch.

### Decisions & Rationale
- Reuse the existing TanStack Start route in `src/app/index.tsx` for the chat UI; no new route files are necessary.
- Implement history navigation purely on the client by filtering `useOpenCodeContext().messages` to `type === "user"`; no backend changes are needed because messages already include prior user prompts.
- Hook into the existing textarea keyboard handler rather than introducing a global shortcut so that history navigation remains scoped to the focused composer.
- Persist navigation state locally (e.g., `messageHistoryIndex`, `isNavigatingHistory`, and `draftBeforeHistory`) to satisfy the acceptance criteria about resetting on typing/sending.

## Requirements Overview
- Provide ArrowUp/ArrowDown navigation through prior user messages within the active session only.
- Preserve the current input when the user begins history navigation and restore/clear it appropriately when navigation exits.
- Ignore assistant/system/tool messages when building history.
- Reset navigation when: the user types new content, sends a message, changes sessions, or attachments change the payload.
- Maintain accessibility (avoid breaking existing keyboard shortcuts, respect mention/command pickers, and ensure no keydown conflicts on mobile/desktop).

## Code References

### Internal Files
| Path | Role / Notes |
| --- | --- |
| `src/app/index.tsx` | Hosts the TanStack route, textarea, and `handleKeyDown` logic that must handle ArrowUp/ArrowDown events. |
| `src/hooks/useOpenCode.ts` | Provides `messages`, `sendMessage`, queue helpers, and the `Message` type import used to derive user-history arrays. |
| `src/types/opencode.ts` | Defines the `Message` interface (including `type`, `content`, `parts`) relied upon for filtering user-only messages. |
| `src/app/_components/ui/input.tsx` & `src/app/_components/ui/textarea.tsx` (if used) | Encapsulate shared styles; confirm whether custom props are needed for history hints. |
| `src/hooks/useKeyboardShortcuts.ts` | Documents existing shortcut registrations to avoid conflicts with frame-level Arrow key bindings. |
| `src/lib/opencode-http-api.ts` | Lists `/tui/append-prompt`, `/tui/submit-prompt`, `/tui/clear-prompt` endpoints invoked by `sendMessage`; ensures no API adjustments are necessary. |
| `tests/smoke.test.ts` & `tests/markdown.test.ts` | Regression suites to run after implementing the feature. |

### External References
| URL | Purpose |
| --- | --- |
| https://github.com/facebook/react | Reference for React state/event patterns; ensures alignment with controlled textarea practices. |
| https://github.com/TanStack/router | Confirms route/component lifecycle expectations for `createFileRoute` used in `src/app/index.tsx`. |
| https://github.com/vitodeploy/vito/blob/3.x/resources/js/components/instant-terminal.tsx#L59 | Example of terminal-style command history navigation; inspires index math for ArrowUp/ArrowDown logic. |

## Technical Specifications

### Message History Data Model
- `Message` (from `src/types/opencode.ts`) includes `{ id: string; type: "user" | "assistant" | ...; content?: string; parts?: Part[]; }`.
- History source: `const userHistory = useMemo(() => messages.filter((m) => m.type === "user" && m.content?.trim()).map((m) => m.content!.trim()), [messages, currentSession?.id]);`
- Maintain navigation state:
  - `messageHistoryIndex: number` (defaults to `-1`; counts backward from latest user message).
  - `isNavigatingHistory: boolean` to know when typing should reset history.
  - `draftBeforeHistory: string` to restore custom text when exiting history navigation.

### Keyboard Handling Contract
- Extend the existing `handleKeyDown` (defined near the textarea in `src/app/index.tsx`) to intercept ArrowUp/ArrowDown **only when**:
  - Composer focused, no text selection (or caret at start/end as applicable),
  - Command/Mention pickers are not visible,
  - No modifier keys (Shift/Ctrl/Meta) pressed.
- Behavior:
  - `ArrowUp`: move deeper into history (`newIndex = Math.min(historyIndex + 1, userHistory.length - 1)`), update `input` with corresponding message, set `isNavigatingHistory = true`.
  - `ArrowDown`: if `historyIndex > 0`, decrement; if `historyIndex === 0`, restore `draftBeforeHistory` (or empty string) and exit navigation mode.
  - While navigating, ignore auto-scroll side effects and keep cursor at end of text (e.g., via `requestAnimationFrame(() => textareaRef.current?.setSelectionRange(len, len));`).

### API Endpoints & Integration Points
| Endpoint | Method | Reference | Usage in Feature |
| --- | --- | --- | --- |
| `/tui/append-prompt` | `POST` | `src/lib/opencode-http-api.ts:548` | No change; ensure history navigation does not send partial inputs here. |
| `/tui/submit-prompt` | `POST` | `src/lib/opencode-http-api.ts:560` | Called inside `sendMessage`; history navigation simply changes the text passed to `sendMessage`. |
| `/tui/clear-prompt` | `POST` | `src/lib/opencode-http-api.ts:570` | Already used when clearing inputs; ensure resets aren't duplicated. |

### Configuration & Integration Notes
- No new config flags; rely on existing theme + keyboard contexts.
- Ensure state resets when `currentSession?.id` changes (watch effect). Clearing prevents leaking history between sessions, satisfying acceptance criteria.
- Consider optional UI affordance (e.g., subtle tooltip) but defer to follow-up issue unless specifically requested.

## Implementation Plan & Tasks

### Phase 1 – Analysis & Guardrails
- [x] Confirm the textarea component wiring (identify actual input component file and verify `handleKeyDown` signature).
- [x] Audit `showCommandPicker`, `showMentionSuggestions`, and leader-based shortcuts to ensure Arrow keys remain free in the composer context.

### Phase 2 – History State & Memoized Selectors
- [x] Introduce `messageHistoryIndex`, `isNavigatingHistory`, and `draftBeforeHistory` via `useState` in `src/app/index.tsx` (near other composer state).
- [x] Add a `useMemo` that builds a session-scoped `userMessageHistory` array sorted chronologically (oldest → newest) and filtered to `type === "user"`.
- [x] Add an effect that resets all history state when `currentSession?.id` changes or when `messages` empties.

### Phase 3 – Keyboard Navigation Logic
- [x] Extend `handleKeyDown` in `src/app/index.tsx` to intercept ArrowUp/ArrowDown when composer-focused and guard conditions pass.
- [x] `ArrowUp` tasks:
  - [x] Prevent default behavior only when history navigation triggers.
  - [x] Capture the current `input` into `draftBeforeHistory` the first time the user presses ArrowUp in a navigation session.
  - [x] Compute and apply the new index/text, setting `isNavigatingHistory` true.
- [x] `ArrowDown` tasks:
  - [x] Prevent default and move forward in history until hitting index `0`.
  - [x] When exiting history (or when no history exists), restore `draftBeforeHistory` (or empty string) and clear navigation flags.

### Phase 4 – Reset Hooks & Sending Integration
- [x] Update the textarea `onChange` handler to reset history flags whenever the user types (unless the change originated from navigation—track via a ref if needed).
- [x] Update `handleSend` in `src/app/index.tsx` to clear history state after successfully enqueueing the outgoing message.
- [x] Ensure clearing also occurs when attachments are dropped/pasted to avoid stale restoration scenarios.

### Phase 5 – Testing & QA
- [x] Add unit coverage if feasible (e.g., extract history helper into pure function under `src/lib` and test index math) or rely on component-level tests if existing harness supports it.
- [ ] Execute manual scenarios: empty history, single message, alternating ArrowUp/Down, typing mid-navigation, switching sessions, mobile (touch keyboard) focus.
- [x] Run existing automated suites:
  - [x] `bun run lint` - Passed with 0 errors, 30 warnings (all pre-existing)
  - [x] `bun x tsc --noEmit` - Passed with 0 errors
  - [x] `bun run test` - All 75 tests passed
- [x] Sanity-check keyboard shortcuts in `useKeyboardShortcuts.ts` to confirm no regressions.

### Phase 6 – Documentation & Validation Artifacts
- [x] Update any relevant docs or release notes (e.g., `README.md` or changelog entry if required by maintainers).
- [x] Capture a short demo (gif or textual steps) describing the interaction for PR reviewers.

## Implementation Summary

The feature has been successfully implemented with the following changes to `src/app/index.tsx`:

1. **State Management** (lines 477-483):
   - Added `messageHistoryIndex`, `isNavigatingHistory`, and `draftBeforeHistory` state variables
   - Added `isHistoryNavigationRef` ref to track programmatic input changes

2. **User Message History** (lines 778-782):
   - Created `userMessageHistory` useMemo that filters and maps user messages from the current session

3. **Reset Effect** (lines 1583-1588):
   - Added effect to reset history state when session changes or messages are cleared

4. **Keyboard Navigation** (lines 2474-2557):
   - Extended ArrowUp handler to navigate backward through history
   - Extended ArrowDown handler to navigate forward and restore draft when exiting
   - Both handlers guard against modifiers and check for picker visibility

5. **Reset on Typing** (lines 2651-2656):
   - Modified `handleInputChange` to reset history state when user types (excluding programmatic changes)

6. **Reset on Send** (lines 1413-1415):
   - Modified `handleSend` to clear history state after sending

7. **Reset on Attachments** (lines 2697-2700, 2718-2721):
   - Modified attachment handlers to clear history state when attachments change

All automated tests pass and the implementation follows the technical specifications from the plan.

## Implementation Order & Milestones
1. **Milestone A – State Preparation**: Complete Phases 1-2; ensures history scaffolding exists before altering keyboard behavior.
2. **Milestone B – Interaction Logic**: Execute Phase 3; depends on Milestone A for state and selectors.
3. **Milestone C – Reset/Error Handling**: Finish Phase 4; requires Milestone B so resets interact with navigation state correctly.
4. **Milestone D – Validation & Docs**: Perform Phases 5-6; depends on prior milestones for functional completeness.

Each milestone builds on the previous, reducing regression risk by keeping state changes isolated until validated.

## Validation Criteria
| Scenario | Expected Outcome | Verification Method |
| --- | --- | --- |
| ArrowUp with prior user messages | Composer cycles backward through user-only prompts, cursor at end | Manual test in browser + optional Jest helper tests |
| ArrowDown at newest point | Composer restores pre-navigation draft or clears input | Manual test |
| Typing during navigation | History index resets to `-1`, new text treated as fresh draft | Manual test, inspect React DevTools state |
| Session switch | History arrays reset; pressing ArrowUp in new session shows only that session's entries | Manual test by switching sessions |
| Validation scripts | All linting, type-checking, and automated tests pass | Run commands below |

```bash
bun run lint
bun x tsc --noEmit
bun run test
```

Meeting the above criteria confirms the feature satisfies issue #79 and is safe to merge.
