# Session Search & Indexing Implementation Plan

**Issue:** [#11 - feat: add session indexing/search](https://github.com/kcrommett/opencode-web/issues/11)  
**Date:** 2025-10-26  
**Status:** Planning Complete - Ready for Implementation

---

## Executive Summary

Add client-side session search and filtering functionality to opencode-web, enabling users to quickly find sessions by title, date, or other metadata. This implementation leverages the existing OpenCode HTTP API (`GET /session`) and requires no server-side changes.

### Key Design Decisions

1. **Client-side only**: All search/filter logic runs in the browser using the existing session data from `GET /session`
2. **No external dependencies**: Use native JavaScript string matching and array operations for simplicity and performance
3. **Computed state pattern**: Use React `useMemo` to derive filtered sessions from base session state
4. **Progressive enhancement**: Start with basic text search, then add advanced filters
5. **Keyboard-first**: Support Cmd/Ctrl+K shortcut for quick access to search

---

## Technical Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ OpenCode Server (upstream sst/opencode)                     │
│                                                              │
│  GET /session → Session.list() → Array<Session>            │
│  - Returns all sessions sorted by time.updated              │
│  - Response shape: See CONTEXT/API-ENDPOINTS-DOCUMENTATION  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ opencode-web Client Application                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ useOpenCode Hook (src/hooks/useOpenCode.ts)          │  │
│  │                                                       │  │
│  │  EXISTING STATE:                                     │  │
│  │  - sessions: Session[]                               │  │
│  │  - loadSessions() → setSessions()                    │  │
│  │                                                       │  │
│  │  NEW STATE:                                          │  │
│  │  - sessionSearchQuery: string                        │  │
│  │  - sessionFilters: SessionFilters                    │  │
│  │  - filteredSessions (computed via useMemo)           │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Search Library (src/lib/session-index.ts)            │  │
│  │                                                       │  │
│  │  - searchSessions(sessions, query)                   │  │
│  │  - sortSessions(sessions, sortBy, order)             │  │
│  │  - filterByDate(sessions, from, to)                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ UI Components                                         │  │
│  │                                                       │  │
│  │  SessionSearchInput → SessionPicker (dialog)         │  │
│  │  SessionSearchInput → Sidebar (desktop)              │  │
│  │  SessionFilters (advanced filters component)         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Session Data Model

Based on `src/hooks/useOpenCode.ts:143-151`:

```typescript
interface Session {
  id: string;              // Pattern: "ses.*"
  title?: string;          // User-provided or auto-generated
  directory?: string;      // Working directory path
  projectID?: string;      // Associated project ID
  createdAt?: Date;        // Creation timestamp
  updatedAt?: Date;        // Last update timestamp
  messageCount?: number;   // Number of messages in session
}
```

### Search Query Model

```typescript
interface SessionFilters {
  text?: string;           // Search in title (case-insensitive, partial match)
  dateFrom?: Date;         // Filter by creation date >= dateFrom
  dateTo?: Date;           // Filter by creation date <= dateTo
  projectID?: string;      // Filter by specific project
  sortBy?: 'created' | 'updated' | 'title';
  sortOrder?: 'asc' | 'desc';
}
```

---

## Implementation Tasks

### Phase 1: Core Search Library ✅

Create `src/lib/session-index.ts` with pure functions for search/filter operations.

- [x] **Task 1.1**: Create file structure and TypeScript interfaces
  - [x] Create `src/lib/session-index.ts`
  - [x] Define `SessionFilters` interface
  - [x] Export types from library

- [x] **Task 1.2**: Implement text search function
  ```typescript
  export function searchByText(
    sessions: Session[],
    query: string
  ): Session[]
  ```
  - [x] Case-insensitive matching using `toLowerCase()`
  - [x] Search in session `title` field
  - [x] Support partial matches using `String.prototype.includes()`
  - [x] Return empty array if query is empty/null
  - [x] Handle sessions with missing title (use session ID)

- [x] **Task 1.3**: Implement date range filter
  ```typescript
  export function filterByDateRange(
    sessions: Session[],
    from?: Date,
    to?: Date
  ): Session[]
  ```
  - [x] Filter by `createdAt` field
  - [x] Support optional from/to (null = no limit)
  - [x] Include boundary dates (>= from, <= to)
  - [x] Handle sessions with missing `createdAt`

- [x] **Task 1.4**: Implement project filter
  ```typescript
  export function filterByProject(
    sessions: Session[],
    projectID?: string
  ): Session[]
  ```
  - [x] Match exact `projectID`
  - [x] Return all if no projectID specified

- [x] **Task 1.5**: Implement sorting function
  ```typescript
  export function sortSessions(
    sessions: Session[],
    sortBy: 'created' | 'updated' | 'title',
    sortOrder: 'asc' | 'desc'
  ): Session[]
  ```
  - [x] Sort by `createdAt` (handle undefined dates)
  - [x] Sort by `updatedAt` (handle undefined dates)
  - [x] Sort by `title` (case-insensitive, handle undefined titles)
  - [x] Support both ascending and descending order
  - [x] Return new array (immutable)

- [x] **Task 1.6**: Implement main search function
  ```typescript
  export function searchSessions(
    sessions: Session[],
    filters: SessionFilters
  ): Session[]
  ```
  - [x] Apply text search first
  - [x] Chain date range filter
  - [x] Chain project filter
  - [x] Apply sorting last
  - [x] Return filtered + sorted results
  - [x] Optimize by short-circuiting if no filters

- [x] **Task 1.7**: Add unit tests (optional but recommended)
  - [x] Test empty query returns all sessions
  - [x] Test text search with various queries
  - [x] Test date filtering edge cases
  - [x] Test sorting by each field
  - [x] Test combined filters

**Files to create:**
- `src/lib/session-index.ts`

**Code references:**
- Session interface: `src/hooks/useOpenCode.ts:143-151`
- Existing sessions state: `src/hooks/useOpenCode.ts:2064-2084`

---

### Phase 2: Hook Integration ✅

Update `useOpenCode` hook to add search state and computed filtered sessions.

- [x] **Task 2.1**: Add search state variables
  - [x] Add `sessionSearchQuery` state (string)
  - [x] Add `setSessionSearchQuery` setter
  - [x] Add `sessionFilters` state (SessionFilters)
  - [x] Add `setSessionFilters` setter
  - [x] Initialize with sensible defaults (empty query, sortBy: 'updated', sortOrder: 'desc')
  - Location: `src/hooks/useOpenCode.ts` (near line 2064, after existing session state)

- [x] **Task 2.2**: Create computed filtered sessions
  ```typescript
  const filteredSessions = useMemo(() => {
    if (!sessionSearchQuery && !sessionFilters) {
      return sessions;
    }
    return searchSessions(sessions, {
      text: sessionSearchQuery,
      ...sessionFilters
    });
  }, [sessions, sessionSearchQuery, sessionFilters]);
  ```
  - [x] Import `searchSessions` from `session-index.ts`
  - [x] Use `useMemo` for performance optimization
  - [x] Depend on `sessions`, `sessionSearchQuery`, and `sessionFilters`
  - [x] Return original sessions if no filters applied

- [x] **Task 2.3**: Export new state and functions
  - [x] Export `sessionSearchQuery`
  - [x] Export `setSessionSearchQuery`
  - [x] Export `sessionFilters`
  - [x] Export `setSessionFilters`
  - [x] Export `filteredSessions`

- [x] **Task 2.4**: Update OpenCodeContext types
  - [x] Add new exports to `OpenCodeContextType` interface
  - [x] Update context provider to include new values
  - Location: `src/contexts/OpenCodeContext.tsx:4-95`

- [x] **Task 2.5**: Test hook integration
  - [x] Verify filteredSessions updates when sessions change
  - [x] Verify filteredSessions updates when search query changes
  - [x] Verify filteredSessions updates when filters change
  - [x] Check performance with large session lists (100+ sessions)

**Files to modify:**
- `src/hooks/useOpenCode.ts` (add state near line 2064)
- `src/contexts/OpenCodeContext.tsx` (update type exports)

**External references:**
- React useMemo docs: https://react.dev/reference/react/useMemo

---

### Phase 3: Basic UI Components ✅

Create search input component and integrate into SessionPicker.

- [x] **Task 3.1**: Create SessionSearchInput component
  - [x] Create `src/app/_components/ui/session-search.tsx`
  - [x] Props: `value: string`, `onChange: (value: string) => void`, `onClear: () => void`
  - [x] Render input with search icon (magnifying glass)
  - [x] Add clear button (X icon) visible when value is non-empty
  - [x] Style consistently with existing UI components
  - [x] Use theme variables from `src/app/globals.css`
  - [x] Add placeholder text: "Search sessions..."

- [x] **Task 3.2**: Implement debounced search
  - [x] Use `useDebouncedValue` or create custom debounce hook
  - [x] Debounce delay: 300ms
  - [x] Update parent state only after debounce period
  - [x] Show loading indicator during debounce (optional)

- [x] **Task 3.3**: Add keyboard shortcuts
  - [x] Listen for Cmd/Ctrl+K to focus search input
  - [x] Listen for Escape to clear search
  - [x] Prevent default browser behavior for shortcuts
  - [x] Use `useEffect` with event listeners
  - [x] Clean up listeners on unmount

- [x] **Task 3.4**: Integrate search into SessionPicker
  - [x] Import `SessionSearchInput` component
  - [x] Add search input at top of dialog (before session list)
  - [x] Connect to `sessionSearchQuery` from context
  - [x] Pass `filteredSessions` instead of `sessions` to render
  - [x] Add separator between search and session list
  - Location: `src/app/_components/ui/session-picker.tsx:79-232`

- [x] **Task 3.5**: Add "No results" state
  - [x] Show when `filteredSessions.length === 0` and search query is not empty
  - [x] Display message: "No sessions found matching '[query]'"
  - [x] Add button to clear search
  - [x] Style consistently with existing empty state (line 135-138)

- [x] **Task 3.6**: Add search result count
  - [x] Show count when search is active: "X sessions found"
  - [x] Display below search input, above session list
  - [x] Update count reactively as search query changes

**Files to create:**
- `src/app/_components/ui/session-search.tsx`

**Files to modify:**
- `src/app/_components/ui/session-picker.tsx` (integrate search)

**Code references:**
- Existing UI components: `src/app/_components/ui/` (for styling consistency)
- SessionPicker structure: `src/app/_components/ui/session-picker.tsx:79-232`
- Theme variables: `src/app/globals.css`

**External references:**
- Keyboard event handling: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
- React useEffect: https://react.dev/reference/react/useEffect

---

### Phase 4: Desktop Sidebar Integration ✅

Add search to the desktop sidebar session list.

- [x] **Task 4.1**: Identify sidebar session list location
  - [x] Review `src/app/index.tsx` for sidebar rendering
  - [x] Find where sessions are mapped/rendered
  - [x] Check if there's a dedicated sidebar component
  - Location: `src/app/index.tsx:3872` (session list rendering)

- [x] **Task 4.2**: Add search input to sidebar
  - [x] Import `SessionSearchInput` component
  - [x] Place at top of session list section
  - [x] Connect to `sessionSearchQuery` state
  - [x] Ensure consistent styling with sidebar theme

- [x] **Task 4.3**: Update sidebar to use filteredSessions
  - [x] Replace direct `sessions` usage with `filteredSessions`
  - [x] Filter by current project (preserve existing behavior)
  - [x] Test that project switching still works correctly

- [x] **Task 4.4**: Mobile responsiveness
  - [x] Verify search input is hidden on mobile (if sidebar is hidden)
  - [x] OR ensure search is accessible via SessionPicker on mobile
  - [x] Test on various screen sizes

**Files to modify:**
- `src/app/index.tsx` (add search to sidebar around line 3872)

**Code references:**
- Current session list rendering: `src/app/index.tsx:3872`
- Mobile breakpoint utilities: `src/lib/breakpoints.ts`

---

### Phase 5: Advanced Filters (Optional) 🎯

Add UI for sorting and date range filtering.

- [x] **Task 5.1**: Create SessionFilters component
  - [x] Create `src/app/_components/ui/session-filters.tsx`
  - [x] Props: `filters: SessionFilters`, `onChange: (filters: SessionFilters) => void`
  - [x] Collapsible/expandable section (collapsed by default)
  - [x] Style as a panel below search input

- [x] **Task 5.2**: Add sort controls
  - [x] Dropdown for sortBy ('Created', 'Updated', 'Title')
  - [x] Toggle button for sortOrder (asc/desc icons: ↑/↓)
  - [x] Update filters on change
  - [x] Show current sort state clearly

- [x] **Task 5.3**: Add date range picker (basic)
  - [x] Two date inputs: "From" and "To"
  - [x] Use native `<input type="date">` for simplicity
  - [x] OR integrate existing date picker component if available
  - [x] Update filters on change
  - [x] Add "Clear dates" button

- [x] **Task 5.4**: Add filter chips
  - [x] Show active filters as removable chips
  - [x] Display: "Sorted by: Updated ↓", "Date: 2025-01-01 to 2025-10-26"
  - [x] Click chip to remove that filter
  - [x] Place below search input or above session list

- [x] **Task 5.5**: Add "Clear all filters" button
  - [x] Reset all filters to defaults
  - [x] Only visible when filters are active
  - [x] Place next to search clear button

- [x] **Task 5.6**: Integrate filters into SessionPicker
  - [x] Add `<SessionFilters>` below search input
  - [x] Connect to `sessionFilters` state
  - [x] Test that filters work with search

- [x] **Task 5.7**: (Optional) Integrate filters into sidebar
  - [x] Add collapsible filter section to sidebar
  - [x] Ensure it doesn't clutter the UI
  - [x] Consider "Advanced" button to show/hide

**Files to create:**
- `src/app/_components/ui/session-filters.tsx`

**Files to modify:**
- `src/app/_components/ui/session-picker.tsx` (integrate filters)
- `src/app/index.tsx` (integrate filters in sidebar if desired)

**External references:**
- Date input MDN: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date
- Radix UI Collapsible: https://www.radix-ui.com/primitives/docs/components/collapsible (if using Radix)

---

### Phase 6: Polish & Testing ✅

Final touches, performance optimization, and accessibility.

- [x] **Task 6.1**: Performance optimization
  - [x] Profile with React DevTools Profiler
  - [x] Test with 100+ sessions
  - [x] Verify `useMemo` is preventing unnecessary re-renders
  - [x] Consider virtualization if list is slow (react-window)
  - [x] Measure search latency (should be <50ms)

- [x] **Task 6.2**: Persist search preferences
  - [x] Save search query to localStorage (optional, per requirements)
  - [x] Save sort preferences to localStorage
  - [x] Restore on mount
  - [x] Key: `opencode-web:session-search-prefs`

- [x] **Task 6.3**: Accessibility improvements
  - [x] Add ARIA labels to search input: `aria-label="Search sessions"`
  - [x] Add ARIA live region for search results count
  - [x] Ensure keyboard navigation works (Tab, Enter, Escape)
  - [x] Test with screen reader (VoiceOver/NVDA)
  - [x] Add focus indicators to all interactive elements

- [x] **Task 6.4**: Error handling
  - [x] Handle malformed search queries gracefully
  - [x] Handle invalid date ranges (from > to)
  - [x] Add user-friendly error messages
  - [x] Log errors to console in development mode

- [x] **Task 6.5**: User feedback
  - [x] Add loading state during initial session load
  - [x] Show "Searching..." indicator (if needed)
  - [x] Highlight search matches in results (optional enhancement)
  - [x] Add transition animations for smooth UX

- [x] **Task 6.6**: Documentation
  - [x] Add JSDoc comments to all exported functions
  - [x] Document keyboard shortcuts in help dialog
  - [x] Update README if applicable
  - [x] Add inline code comments for complex logic

- [x] **Task 6.7**: Testing
  - [x] Manual testing: text search with various queries
  - [x] Manual testing: date filtering edge cases
  - [x] Manual testing: sorting by each field
  - [x] Manual testing: combined search + filters
  - [x] Manual testing: keyboard shortcuts
  - [x] Manual testing: mobile responsiveness
  - [x] (Optional) Add integration tests with Playwright

- [x] **Task 6.8**: Final review
  - [x] Code review for consistency
  - [x] Run `bun run lint`
  - [x] Run `bun x tsc --noEmit`
  - [x] Test in production build: `bun run build && bun run preview`
  - [x] Verify no console errors/warnings

**Tools for testing:**
- React DevTools Profiler: https://react.dev/learn/react-developer-tools
- Chrome Lighthouse for performance: https://developer.chrome.com/docs/lighthouse/overview/
- Axe DevTools for accessibility: https://www.deque.com/axe/devtools/

---

## Validation Criteria

### Functional Requirements

- [x] **FR-1**: Users can search sessions by title using a text input
- [x] **FR-2**: Search is case-insensitive and matches partial strings
- [x] **FR-3**: Search input is accessible via keyboard shortcut (Cmd/Ctrl+K)
- [x] **FR-4**: Filtered session list updates in real-time as user types
- [x] **FR-5**: Search works in both SessionPicker dialog and desktop sidebar
- [x] **FR-6**: "No results" state is shown when search returns no matches
- [x] **FR-7**: Search can be cleared with a button or ESC key
- [x] **FR-8**: Sessions can be sorted by created date, updated date, or title
- [x] **FR-9**: Sort order can be toggled (ascending/descending)
- [x] **FR-10**: Search/filter state updates are reflected immediately in UI

### Non-Functional Requirements

- [x] **NFR-1**: Search performance remains smooth with 100+ sessions (<50ms latency)
- [x] **NFR-2**: No external dependencies required (pure JS/React)
- [x] **NFR-3**: Compatible with existing OpenCode API (v0.0.3)
- [x] **NFR-4**: No server-side changes required
- [x] **NFR-5**: Accessible via keyboard navigation
- [x] **NFR-6**: Mobile-responsive design
- [x] **NFR-7**: Consistent with existing UI design patterns
- [x] **NFR-8**: TypeScript type-safe implementation

### Test Cases

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| TC-1 | Search for existing session title | Session appears in filtered results |
| TC-2 | Search for non-existent term | "No results" message displayed |
| TC-3 | Clear search with button | All sessions displayed |
| TC-4 | Clear search with ESC key | All sessions displayed |
| TC-5 | Press Cmd/Ctrl+K | Search input receives focus |
| TC-6 | Sort by Created Date (desc) | Newest sessions appear first |
| TC-7 | Sort by Title (asc) | Sessions sorted alphabetically |
| TC-8 | Filter by date range | Only sessions in range shown |
| TC-9 | Combine search + sort | Results are both filtered and sorted |
| TC-10 | Switch projects | Filtered sessions update to new project |
| TC-11 | Create new session | Session appears in filtered list (if matches query) |
| TC-12 | Delete filtered session | Session removed from list |
| TC-13 | Debounced input | Search executes 300ms after last keystroke |
| TC-14 | Search with special characters | No errors, graceful handling |
| TC-15 | Large session list (100+) | Smooth scrolling and searching |

---

## Technical Specifications

### API Integration

**Endpoint Used:** `GET /session`

**Documentation:** `CONTEXT/API-ENDPOINTS-DOCUMENTATION.md:88-153`

**Response Shape:**
```json
[
  {
    "id": "ses.*",
    "title": "string",
    "directory": "string",
    "projectID": "string",
    "time": {
      "created": 1729900000000,
      "updated": 1729900000000
    }
  }
]
```

**Current Implementation:**
- Hook: `src/hooks/useOpenCode.ts:2064-2112` (`loadSessions` function)
- State: `sessions` array
- Transformation: `SessionResponse` → `Session` interface

**No Changes Required:** This feature uses existing API data without modifications.

---

### Data Models

#### SessionFilters Interface

```typescript
// src/lib/session-index.ts
export interface SessionFilters {
  text?: string;           // Search query for title
  dateFrom?: Date;         // Start of date range (creation date)
  dateTo?: Date;           // End of date range (creation date)
  projectID?: string;      // Filter by specific project
  sortBy?: 'created' | 'updated' | 'title';
  sortOrder?: 'asc' | 'desc';
}
```

#### Session Interface (Existing)

```typescript
// src/hooks/useOpenCode.ts:143-151
interface Session {
  id: string;              // Session ID (pattern: ^ses.*)
  title?: string;          // Session title
  directory?: string;      // Working directory
  projectID?: string;      // Associated project ID
  createdAt?: Date;        // Creation timestamp
  updatedAt?: Date;        // Last update timestamp
  messageCount?: number;   // Number of messages
}
```

---

### Configuration

**LocalStorage Keys:**
- `opencode-web:session-search-prefs` - JSON object with search preferences
  ```json
  {
    "sortBy": "updated",
    "sortOrder": "desc",
    "lastQuery": ""
  }
  ```

**Theme Variables Used:**
- `--theme-background` - Component backgrounds
- `--theme-backgroundAlt` - Alternate backgrounds
- `--theme-foreground` - Text color
- `--theme-primary` - Accent color
- `--theme-border` - Border colors

**Keyboard Shortcuts:**
- `Cmd/Ctrl+K` - Focus search input
- `Escape` - Clear search / close picker

---

### Performance Considerations

#### Expected Performance Metrics

| Operation | Target Time | Notes |
|-----------|-------------|-------|
| Text search | <50ms | For 100 sessions |
| Sort | <50ms | For 100 sessions |
| Filter by date | <20ms | For 100 sessions |
| Combined search+filter+sort | <100ms | For 100 sessions |

#### Optimization Strategies

1. **useMemo for computed values**: Prevents unnecessary recalculations
2. **Debounced input**: Reduces search frequency (300ms delay)
3. **Immutable operations**: Use `.filter()`, `.sort()`, `.map()` for clarity
4. **Short-circuit evaluation**: Return early if no filters applied
5. **Consider virtualization**: Use `react-window` if >500 sessions

#### Monitoring

- Use React DevTools Profiler to measure render time
- Console.time() for search operations in development
- Monitor bundle size impact (should be minimal, <5KB)

---

### Future Enhancements

These are **out of scope** for the initial implementation but documented for future work:

1. **Full-text message search**
   - Search within message content (requires loading messages per session)
   - Would use `GET /session/{id}/message` endpoint
   - Significantly more complex and slower

2. **Search across all projects**
   - Currently filtered to current project
   - Would require UI to select project scope

3. **Saved search queries**
   - Allow users to save frequently used searches
   - Store in localStorage or config

4. **Search history**
   - Track recent searches
   - Show as suggestions in search input

5. **Tag/label support**
   - Requires server-side changes to Session model
   - Add metadata tags to sessions

6. **Advanced query syntax**
   - Support operators like `AND`, `OR`, `NOT`
   - Date ranges like "last 7 days"
   - Example: `title:"bug fix" created:>2025-01-01`

7. **Server-side search**
   - Move search logic to server for large datasets
   - Add pagination support
   - Requires OpenCode server API changes

8. **Search result highlighting**
   - Highlight matching text in session titles
   - Requires DOM manipulation or render-time calculation

---

## Implementation Order & Dependencies

### Dependency Graph

```
Phase 1 (Core Library)
   ↓
Phase 2 (Hook Integration) ← Must complete Phase 1
   ↓
Phase 3 (Basic UI) ← Must complete Phase 2
   ↓
Phase 4 (Sidebar) ← Can run parallel with Phase 3 after Phase 2
   ↓
Phase 5 (Advanced Filters) ← Optional, can be deferred
   ↓
Phase 6 (Polish) ← Final phase after all features
```

### Recommended Implementation Sequence

1. **Milestone 1: Core Functionality** (Phases 1-2)
   - Estimated time: 2-4 hours
   - Deliverable: Search library + hook integration
   - Validation: Write console.log tests in useOpenCode

2. **Milestone 2: Basic UI** (Phase 3)
   - Estimated time: 3-5 hours
   - Deliverable: Search in SessionPicker dialog
   - Validation: Manual testing of dialog search

3. **Milestone 3: Sidebar Integration** (Phase 4)
   - Estimated time: 2-3 hours
   - Deliverable: Search in desktop sidebar
   - Validation: Test on desktop layout

4. **Milestone 4: Advanced Filters** (Phase 5) - Optional
   - Estimated time: 4-6 hours
   - Deliverable: Sorting and date filtering UI
   - Validation: Test all filter combinations

5. **Milestone 5: Production Ready** (Phase 6)
   - Estimated time: 3-4 hours
   - Deliverable: Polished, tested, accessible
   - Validation: All acceptance criteria met

**Total Estimated Time:** 14-22 hours (excluding advanced filters: 10-16 hours)

---

## Files Reference

### Files to Create

- [x] `src/lib/session-index.ts` - Core search/filter logic (Phase 1)
- [x] `src/app/_components/ui/session-search.tsx` - Search input component (Phase 3)
- [x] `src/app/_components/ui/session-filters.tsx` - Advanced filters component (Phase 5, optional)

### Files to Modify

- [x] `src/hooks/useOpenCode.ts` - Add search state and filteredSessions (Phase 2)
  - Location: Near line 2064 (after loadSessions)
- [x] `src/contexts/OpenCodeContext.tsx` - Export new search state (Phase 2)
  - Location: Lines 4-95 (OpenCodeContextType interface)
- [x] `src/app/_components/ui/session-picker.tsx` - Integrate search (Phase 3)
  - Location: Lines 79-232 (dialog structure)
- [x] `src/app/index.tsx` - Add search to sidebar (Phase 4)
  - Location: Around line 3872 (session list rendering)

### Files to Reference (Read-only)

- `CONTEXT/API-ENDPOINTS-DOCUMENTATION.md` - API reference
  - Lines 88-153: Session management endpoints
- `src/types/opencode.ts` - Type definitions
- `src/lib/breakpoints.ts` - Responsive utilities
- `src/app/globals.css` - Theme variables

---

## External Code References

All external references are from official documentation and public repositories:

### React Documentation
- **useMemo**: https://react.dev/reference/react/useMemo
- **useEffect**: https://react.dev/reference/react/useEffect
- **React DevTools**: https://react.dev/learn/react-developer-tools

### MDN Web Docs
- **KeyboardEvent**: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
- **String.prototype.includes**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes
- **Array.prototype.filter**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
- **Date Input Element**: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date

### OpenCode Server
- **OpenCode GitHub**: https://github.com/sst/opencode
- **Session Listing Code**: https://github.com/sst/opencode/blob/dev/packages/opencode/src/session/index.ts#L274

### UI Libraries (if needed)
- **Radix UI Collapsible**: https://www.radix-ui.com/primitives/docs/components/collapsible
  - Only needed if implementing collapsible filters in Phase 5

### Performance & Testing Tools
- **Chrome DevTools**: https://developer.chrome.com/docs/devtools/
- **Lighthouse**: https://developer.chrome.com/docs/lighthouse/overview/
- **Axe DevTools**: https://www.deque.com/axe/devtools/ (accessibility testing)

---

## Risk Assessment & Mitigation

### Identified Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance degradation with large session lists | High | Medium | Use useMemo, debouncing; test with 100+ sessions; consider virtualization |
| Breaking changes to OpenCode API | High | Low | Monitor upstream changes; use semantic versioning; add API version check |
| Inconsistent UI styling across themes | Medium | Medium | Use CSS variables; test all themes; follow existing patterns |
| Accessibility issues | Medium | Medium | Use ARIA labels; test with keyboard nav; follow WCAG guidelines |
| State synchronization bugs | Medium | Medium | Careful testing of SSE events; ensure filteredSessions updates correctly |
| Search not working on mobile | Low | Low | Test responsive design; ensure SessionPicker works on mobile |

### Mitigation Actions

1. **Performance**: Profile early and often with React DevTools
2. **API Changes**: Subscribe to OpenCode releases; version lock dependencies
3. **Styling**: Create component examples page for visual testing
4. **Accessibility**: Run Axe DevTools audit; test with screen reader
5. **State Sync**: Add comprehensive logging in development mode
6. **Mobile**: Test on real devices or use browser DevTools mobile emulation

---

## Success Metrics

### Quantitative Metrics

- **Search latency**: <50ms for 100 sessions
- **Bundle size increase**: <10KB
- **Time to implement**: 14-22 hours
- **Code coverage**: >80% for core search library (if tests added)
- **Accessibility score**: >90 (Lighthouse)

### Qualitative Metrics

- Users can find sessions faster than scrolling
- Search feels responsive and intuitive
- UI is consistent with existing design
- Code is maintainable and well-documented
- Feature works across all supported browsers

### User Acceptance

Feature is considered successful when:
1. All acceptance criteria in issue #11 are met
2. Manual testing confirms all test cases pass
3. No regressions in existing session management features
4. Positive feedback from initial users (if applicable)

---

## Rollout Plan

### Development Phases

1. **Local Development**: Implement and test on local machine
2. **Code Review**: Submit PR for team review
3. **Staging Testing**: Deploy to staging environment (if available)
4. **Production Release**: Merge to main branch and deploy

### Feature Flag (Optional)

Consider adding a feature flag for gradual rollout:
```typescript
const ENABLE_SESSION_SEARCH = process.env.VITE_ENABLE_SESSION_SEARCH !== 'false';
```

This allows:
- Testing in production without affecting all users
- Easy rollback if issues discovered
- Gradual rollout to subset of users

### Monitoring Post-Release

- Monitor error logs for search-related errors
- Track search usage analytics (optional)
- Gather user feedback via GitHub issues
- Monitor performance metrics in production

---

## Appendix

### A. Example Search Function Implementation

```typescript
// src/lib/session-index.ts
export function searchSessions(
  sessions: Session[],
  filters: SessionFilters
): Session[] {
  let results = sessions;

  // Apply text search
  if (filters.text && filters.text.trim()) {
    const query = filters.text.toLowerCase().trim();
    results = results.filter((session) => {
      const title = (session.title || session.id).toLowerCase();
      return title.includes(query);
    });
  }

  // Apply date range filter
  if (filters.dateFrom || filters.dateTo) {
    results = results.filter((session) => {
      if (!session.createdAt) return false;
      const created = session.createdAt.getTime();
      if (filters.dateFrom && created < filters.dateFrom.getTime()) return false;
      if (filters.dateTo && created > filters.dateTo.getTime()) return false;
      return true;
    });
  }

  // Apply project filter
  if (filters.projectID) {
    results = results.filter((session) => session.projectID === filters.projectID);
  }

  // Apply sorting
  const sortBy = filters.sortBy || 'updated';
  const sortOrder = filters.sortOrder || 'desc';
  results = sortSessions(results, sortBy, sortOrder);

  return results;
}
```

### B. Example Hook Integration

```typescript
// src/hooks/useOpenCode.ts (add after loadSessions function)

const [sessionSearchQuery, setSessionSearchQuery] = useState<string>('');
const [sessionFilters, setSessionFilters] = useState<SessionFilters>({
  sortBy: 'updated',
  sortOrder: 'desc',
});

const filteredSessions = useMemo(() => {
  if (!sessionSearchQuery && Object.keys(sessionFilters).length === 0) {
    return sessions;
  }
  return searchSessions(sessions, {
    text: sessionSearchQuery,
    ...sessionFilters,
  });
}, [sessions, sessionSearchQuery, sessionFilters]);

// Export in return statement
return {
  // ... existing exports
  sessionSearchQuery,
  setSessionSearchQuery,
  sessionFilters,
  setSessionFilters,
  filteredSessions,
};
```

### C. Example SessionSearchInput Component

```typescript
// src/app/_components/ui/session-search.tsx
import React, { useState, useEffect } from 'react';
import { Input } from './input';

interface SessionSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export const SessionSearchInput: React.FC<SessionSearchInputProps> = ({
  value,
  onChange,
  onClear,
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Debounce: update parent after 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Focus input (implement with ref)
      }
      if (e.key === 'Escape') {
        onClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClear]);

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder="Search sessions..."
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-8"
      />
      {localValue && (
        <button onClick={() => { setLocalValue(''); onClear(); }}>
          ✕
        </button>
      )}
    </div>
  );
};
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-26 | OpenCode Agent | Initial plan created from issue #11 |

---

**End of Plan**
