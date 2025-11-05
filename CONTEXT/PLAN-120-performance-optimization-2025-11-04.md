## Context & Goals
- **Source**: GitHub issue #120 “Optimize Performance: Reduce Excessive Hook Calls and Keyboard Event Processing”. Goal is to prevent redundant `useOpenCode` initializations and reduce unnecessary keyboard handler work without regressing UX.
- **Symptoms**: `src/hooks/useOpenCode.ts:290` logs `🔥 useOpenCode hook INITIALIZED` far more often than expected, meaning the hook re-renders and re-registers expensive effects continuously. `src/hooks/useKeyboardShortcuts.ts:233-441` handles every keydown event even when the leader key is inactive, repeatedly calling `isInputFocused()` / `isDialogOpen()` and flooding logs.
- **Constraints & decisions**:
  - Keep the hook API surface the same for dependents such as `src/contexts/OpenCodeContext.tsx` so downstream components remain untouched.
  - Debug logging must be silenced in production builds yet still available in development via the existing `process.env.NODE_ENV !== "production"` guard.
  - Prefer memoization and derived state helpers over proliferating new context providers to limit churn.
  - Optimizations must stay compatible with server-driven data (`openCodeService` in `src/lib/opencode-client.ts`) and SSE state transitions.
  - Follow project standards from `AGENTS.md`: Bun-based scripts, minimal `else`, TypeScript type safety, no uncontrolled logging.

## Internal Code References
| Scope | Path | Notes |
| --- | --- | --- |
| Hook state explosion | `src/hooks/useOpenCode.ts` | Holds >30 pieces of state, expensive `useEffect` chains, memoized filtering, debug log at line 290.
| Keyboard pipeline | `src/hooks/useKeyboardShortcuts.ts` | Global listener with unconditional event processing, repeated DOM queries, noisy logs for space/n/e/s/p.
| Context wiring | `src/hooks/useKeyboardShortcutsWithContext.ts` | Registers dozens of shortcuts against `useKeyboardShortcuts`, depends on leader/secondary state.
| Consumers | `src/contexts/OpenCodeContext.tsx`, `src/app/_components/ui/*` | Receive hook outputs, expect stable references for memoization.
| Services/API | `src/lib/opencode-client.ts`, `src/lib/opencode-events.ts`, `src/lib/session-index.ts` | Provide async data, SSE updates, session filtering.

## External References
| Purpose | Git URL | Notes |
| --- | --- | --- |
| Effect & memoization best practices | https://github.com/reactjs/react.dev/blob/main/src/content/learn/you-might-not-need-an-effect.md | Reinforces reducing unnecessary effects and deriving state lazily.
| Keyboard shortcut batching patterns | https://github.com/JohannesKlauss/react-hotkeys-hook | Reference for gating event listeners and throttling handler work.

## Technical Specifications
### Data & API Contracts
| Concern | API/Utility | Inputs | Outputs/Usage |
| --- | --- | --- | --- |
| Sessions/projects/models | `openCodeService.getSessions`, `.getCurrentProject`, `.getProviders` | optional `directory` | Provide data that seeds `useOpenCode` state; must be cached/memoized to avoid ref churn.
| SSE lifecycle | `OpencodeEvent` / `SSEConnectionState` from `src/lib/opencode-events.ts` | SSE payloads via `openCodeService` | Hook must maintain stable references for queue/message processing.
| Session search | `searchSessions` from `src/lib/session-index.ts` | `Session[]` plus filters | Already pure; wrap with `useMemo` + shallow compare inputs to avoid recalculation.
| Keyboard consumers | `useOpenCodeContext` exports `setShowHelp`, `selectFrame`, `abortSession`, etc. | invoked by shortcuts | Need stable callbacks or at least locally cached references to prevent rerenders.

### Behavioral Requirements
- `useOpenCode` should:
  - Initialize network data exactly once per project/session change using guarded `useEffect`s and `useRef` flags.
  - Memoize derived data such as `filteredSessions`, `sessionActivity`, and `recentModels` slices to prevent cascaded renders.
  - Batch state updates where possible (e.g., `setState` with reducers or `flushSync` already used for SSE queue) to minimize commit phases.
  - Gate debug logging behind `isDevEnvironment` variable.
- `useKeyboardShortcuts` should:
  - Attach a single keydown listener that exits early if leader mode is inactive, no modal-specific shortcuts exist, and the key is outside the tracked set.
  - Cache DOM query results per event (e.g., result of `isInputFocused()`), and avoid logging except when `isDevEnvironment`.
  - Expose `activateLeader`, `deactivateLeader`, and `registerShortcut` without changing signatures so `useKeyboardShortcutsWithContext` remains compatible.

## Implementation Plan & Tasks (Sequenced)
### Milestone 0 – Baseline instrumentation & safeguards
- [x] Add `performance.mark` / `performance.measure` (guarded by `isDevEnvironment`) around `useOpenCode` initialization and keyboard handler entry to establish current metrics.
- [x] Introduce `useRef` counters (dev-only) to tally hook mounts and key event volume; expose via console table only when `NODE_ENV !== "production"`.

### Milestone 1 – Refactor `useOpenCode`
- [ ] Audit state buckets and group related pieces via `useReducer` or grouped `useState` objects (e.g., session search state, UI toggles) to minimize independent updates.
- [ ] Memoize derived collections (`filteredSessions`, `sessionModelMap`, `recentModels`) with precise dependency arrays; ensure `searchSessions` only runs when `sessions` or filter inputs change.
- [ ] Replace repeated inline computations (model resolution, permissions) with `useMemo` or `useCallback` helpers stored near usage to prevent new references on each render.
- [ ] Wrap async initializers (config load, provider fetch, session lists) in `useEffect` blocks keyed to specific dependencies (`currentProject?.id`, `currentPath`) and short-circuit when data already loaded.
- [ ] Remove or guard `debugLog("🔥 useOpenCode hook INITIALIZED")` so it only fires when `isDevEnvironment && !didMountRef.current`.
- [ ] Consider splitting rarely-used UI toggles (help/onboarding/theme panels) into a lightweight hook (e.g., `useOpenCodeOverlays`) imported by the single consumer to prevent re-renders in every screen.

### Milestone 2 – Optimize keyboard shortcut handling
- [ ] Introduce a `shouldHandleKey` utility that short-circuits when the key is not in `trackedKeys` and leader/secondary states are inactive; call before expensive DOM checks.
- [ ] Cache results of `isInputFocused()` / `isDialogOpen()` per event; store in local variables instead of recomputing.
- [ ] Replace scattered debug logs with a single conditional logger invoked only when `isDevEnvironment` and the key is in a debug whitelist.
- [ ] Add early return for `KeyboardEvent.repeat` to ignore held-down keys when leader mode is irrelevant.
- [ ] Store `shortcuts` in a `useRef` backed structure (or ensure `setShortcuts` dedupes) so `Array.find` searches smaller slices; consider indexing by key when `leaderActive`.
- [ ] Ensure `space` handling respects `spacePassthroughRef` without performing extra work when leader can't activate (input focused, dialog open).

### Milestone 3 – Context integration & regressions prevention
- [ ] Update `useKeyboardShortcutsWithContext.ts` to align with any new return signatures (if additional memoized helpers exposed) and ensure `useEffect` dependency arrays leverage stable references.
- [ ] Validate `OpenCodeContext` provider continues to receive stable objects (wrap value in `useMemo`).
- [ ] Document any new helper hooks (`useOpenCodeOverlays`, `useSessionFilters`) inside `src/contexts/OpenCodeContext.tsx` comments for future maintainers.

### Milestone 4 – Validation & cleanup
- [ ] Remove temporary `performance.mark` instrumentation if not desired in production, or guard behind `isDevEnvironment`.
- [ ] Run local verification suite:
  ```bash
  bun run lint
  bun x tsc --noEmit
  bun run test
  bun run build
  ```
- [ ] Use React Profiler (or `why-did-you-render` if already configured) to confirm decreased render counts for components consuming `useOpenCode` and keyboard shortcuts.
- [ ] Update issue #120 with metrics (before/after hook init counts, key handler ms) and document in release notes if benchmarks improve materially.

## Implementation Order & Dependencies
1. **Instrumentation (Milestone 0)** provides baseline numbers; ensures subsequent optimizations can be validated.
2. **Hook refactor (Milestone 1)** must precede keyboard optimizations because `useKeyboardShortcutsWithContext` depends on stable context slices from `useOpenCode`.
3. **Keyboard handler improvements (Milestone 2)** occur after `useOpenCode` exposes stable leader state to prevent conflicting renders.
4. **Context adjustments (Milestone 3)** ensure no regressions for UI components relying on old behavior.
5. **Validation (Milestone 4)** wraps up with automated tests, manual profiling, and documentation updates.

## Validation Criteria
- Hook initialization count (tracked via dev-only ref) decreases to one per mount except when dependencies legitimately change.
- Keyboard handler only processes events when leader mode, modal shortcuts, or explicitly tracked keys are relevant; measured average processing time per event decreases (target <1ms for irrelevant keys).
- No TypeScript errors, lint violations, or failing tests after changes.
- UI behavior (leader key interactions, modal shortcuts, session filtering) remains functionally identical; confirmed via manual QA on desktop + mobile breakpoints.
- Debug logging absent in production builds while still available locally.

## Metrics & Monitoring
| Metric | How to Measure | Target |
| --- | --- | --- |
| `useOpenCode` mount count | Dev-only `useRef` counter + console summary | 1 initial mount per page load; additional mounts only when provider remounts.
| Keyboard event processing time | `performance.measure` around handler when key processed | <1ms for ignored keys, <5ms for handled shortcuts.
| Rerender frequency | React Profiler for components consuming `useOpenCodeContext` | Reduce commits by ≥30% during typing tests.
| Memory usage | Chrome Performance panel during 5-min typing session | Flat memory graph (no continuous growth from queued states).

## Risks & Mitigations
- **Regressions in shortcut behavior** due to aggressive early returns → Mitigate with exhaustive shortcut map unit tests or storybook-style manual scenarios.
- **State desync** if hook splitting causes stale references → Use `useRef` caches and derived state selectors to keep source of truth centralized.
- **Over-optimization** leading to premature abstraction → Extract helper hooks only when they clearly decouple rarely-used state (overlay toggles) to avoid fragmentation.

## Issue Integration Notes
- Acceptance criteria from issue #120 are explicitly mirrored in milestone tasks (reducing hook inits, optimizing keyboard processing, removing debug logs, adding memoization, preventing re-renders).
- Additional requirement: instrument performance metrics post-optimization to catch regressions early; update GitHub issue with findings before closure.
