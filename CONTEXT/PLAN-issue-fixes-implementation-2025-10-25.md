# Issue Fixes Implementation Plan

**Date**: 2025-10-25  
**Status**: Planning  
**Target Issues**: #23 (@ mentions subagents), #34 (Session deletion UX), #15 (Token usage mismatch)

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Issue #23: @ Mentions Should List Subagents](#issue-23--mentions-should-list-subagents)
   - Context & Technical Approach
   - Implementation Tasks (7 tasks)
   - Validation Checklist
3. [Issue #34: Session Deletion UX Polish](#issue-34-session-deletion-ux-polish)
   - Context & Technical Approach
   - Implementation Tasks (7 tasks)
   - Validation Checklist
4. [Issue #15: Token Usage Mismatch vs CLI](#issue-15-token-usage-mismatch-vs-cli)
   - Context & Technical Approach
   - Data Structures (verified from codebase)
   - Implementation Tasks (8 tasks, including prerequisite type fix)
   - Validation Checklist
5. [Implementation Sequence & Dependencies](#implementation-sequence--dependencies)
6. [Code Reference Index](#code-reference-index)
7. [Testing Strategy](#testing-strategy)
8. [Open Questions & Decisions](#open-questions--decisions)

---

## Executive Summary

This plan addresses three low-effort, high-impact UX issues identified in the OpenCode Web client by aligning with upstream TUI/Desktop patterns. All fixes leverage existing infrastructure and require no server-side changes.

### Key Findings from Investigation

#### Issue #23 (@ Mentions)
- **Current State**: Web filters out subagents at line 2394 in `useOpenCode.ts`
- **Root Cause**: `agents` array only includes `primary || all` modes; subagents excluded
- **Fix**: Maintain separate `subagents` state, merge with files in @ completion
- **Complexity**: Low - reuse existing file suggestion UI

#### Issue #34 (Session Deletion)
- **Current State**: `window.confirm` with no context, no bulk operations
- **Root Cause**: Simple implementation, never polished
- **Fix**: Controlled dialogs + checkbox selection + `Promise.allSettled` for bulk
- **Complexity**: Medium - new UI components, bulk operation logic

#### Issue #15 (Token Usage)
- **Current State**: `sessionTokenStats` memo reduces all messages on every render (line 1448)
- **Root Cause**: Naive implementation that doesn't account for SSE behavior or cache tokens
- **Critical Discovery**: 
  - Web's TypeScript types **missing** `cache.read` and `cache.write` fields
  - Desktop client proves server sends these fields (line 309 in session-timeline.tsx)
  - Web silently ignores them due to incomplete type definition
- **Fix**: 
  1. Update SSE event types to include cache fields
  2. Track session-level totals in Map, update on `message.updated` events
  3. Replace memo's `reduce()` with Map lookup
- **Complexity**: Medium - requires type fix, state management, careful deduplication

### Success Criteria
- [ ] Typing `@` triggers completion showing subagents first, then files
- [ ] Session deletion confirms with descriptive dialogs and supports bulk operations
- [ ] Token usage totals match CLI output (session-scoped aggregation)
- [ ] Cache tokens (`cache.read`, `cache.write`) included in totals
- [ ] All changes pass `bun run lint` and `bun x tsc --noEmit`
- [ ] Manual testing confirms behavior matches upstream TUI/Desktop clients
- [ ] No performance regression (check with long sessions: 100+ messages)

---

## Issue #23: @ Mentions Should List Subagents

### Context & Rationale

**Problem**: Currently `@` only triggers file completion. Users cannot invoke subagents via `@mention` as documented.

**Upstream Behavior**: TUI shows agents provider **first** when `@` is typed, filtering for subagents/all-mode only. Desktop client supports the same pattern. Primary agents handle `@mention` by spawning task tool subtasks.

**Key Insight**: Primary agents are for mode switching (Tab key/agent picker), subagents are for task delegation (`@mention`).

### Technical Approach

#### Data Model Changes

**File**: `src/hooks/useOpenCode.ts`

Current state (line 2394-2396):
```typescript
const agentsArray = allAgents.filter(
  (agent) => agent.mode === "primary" || agent.mode === "all" || !agent.mode
);
```

**Change**: Maintain two separate filtered arrays:

1. **Keep existing `agents`** for agent picker (Tab key):
   - Filter: `mode === "primary" || mode === "all" || !mode`
   - Usage: Mode switching UI

2. **Add new `subagents`** state for @ completion:
   - Filter: `mode === "subagent" || mode === "all"`
   - Usage: Mention completion provider

```typescript
// After line 2396, add:
const subagentsArray = allAgents.filter(
  (agent) => agent.mode === "subagent" || agent.mode === "all"
);
setSubagents(subagentsArray);
```

#### Completion Provider Implementation

**File**: `src/app/index.tsx`

Create agent filter function (add near line 1285):

```typescript
const searchAgents = (query: string, agents: Agent[]): MentionSuggestion[] => {
  const lowerQuery = query.toLowerCase();
  return agents
    .filter((agent) => {
      const nameMatch = agent.name?.toLowerCase().includes(lowerQuery);
      const descMatch = agent.description?.toLowerCase().includes(lowerQuery);
      return nameMatch || descMatch;
    })
    .map((agent) => ({
      type: "agent",
      name: agent.name,
      description: agent.description,
      label: `${agent.name} (agent)`,
    }))
    .slice(0, 5);
};
```

**Type Definition**: Add to `src/types/opencode.ts`:

```typescript
export type MentionSuggestion = 
  | { type: "agent"; name: string; description?: string; label: string }
  | { type: "file"; path: string; label: string };
```

#### @ Trigger Logic Update

**File**: `src/app/index.tsx` (lines 1285-1300)

**Before**:
```typescript
if (value.includes("@")) {
  const query = value.split("@").pop() || "";
  if (query.length > 0) {
    try {
      const suggestions = await searchFiles(query);
      setFileSuggestions(suggestions.slice(0, 5));
      setShowFileSuggestions(true);
    } catch (error) {
      console.error("Failed to search files:", error);
    }
  } else {
    setShowFileSuggestions(false);
  }
}
```

**After**:
```typescript
if (value.includes("@")) {
  const query = value.split("@").pop() || "";
  if (query.length > 0) {
    try {
      // Parallel fetch: agents first, then files (matching TUI order)
      const [agentResults, fileResults] = await Promise.all([
        Promise.resolve(searchAgents(query, subagents)),
        searchFiles(query).then(files => 
          files.slice(0, 5).map(f => ({ type: "file" as const, path: f, label: f }))
        ),
      ]);
      
      // Agents first in combined list
      const combined = [...agentResults, ...fileResults];
      setMentionSuggestions(combined);
      setShowMentionSuggestions(true);
    } catch (error) {
      console.error("Failed to search mentions:", error);
    }
  } else {
    setShowMentionSuggestions(false);
  }
}
```

#### UI Rendering

**File**: `src/app/index.tsx` (existing file suggestion rendering area)

Update suggestion list to handle both types:

```tsx
{showMentionSuggestions && mentionSuggestions.length > 0 && (
  <View className="mention-suggestions">
    {mentionSuggestions.map((suggestion, i) => (
      <button
        key={suggestion.label}
        onClick={() => handleMentionSelect(suggestion)}
        className={cn(
          "suggestion-item",
          suggestion.type === "agent" && "agent-suggestion"
        )}
      >
        <span className="suggestion-name">{suggestion.label}</span>
        {suggestion.type === "agent" && suggestion.description && (
          <span className="suggestion-desc muted">{suggestion.description}</span>
        )}
      </button>
    ))}
  </View>
)}
```

**Styling**: Add to `src/app/globals.css`:

```css
.agent-suggestion {
  border-left: 2px solid var(--theme-primary);
}

.suggestion-desc {
  font-size: 0.875rem;
  opacity: 0.6;
}
```

#### Selection Handler

**File**: `src/app/index.tsx`

```typescript
const handleMentionSelect = (suggestion: MentionSuggestion) => {
  const currentValue = inputRef.current?.value || "";
  const beforeAt = currentValue.substring(0, currentValue.lastIndexOf("@"));
  
  if (suggestion.type === "agent") {
    // Insert @agent-name with trailing space
    const newValue = `${beforeAt}@${suggestion.name} `;
    if (inputRef.current) inputRef.current.value = newValue;
  } else {
    // Insert @file/path with trailing space
    const newValue = `${beforeAt}@${suggestion.path} `;
    if (inputRef.current) inputRef.current.value = newValue;
  }
  
  setShowMentionSuggestions(false);
  inputRef.current?.focus();
};
```

### Implementation Tasks

- [x] **Task 1.1**: Add `subagents` state to `useOpenCode` hook
  - File: `src/hooks/useOpenCode.ts:2394-2398`
  - Add state declaration: `const [subagents, setSubagents] = useState<Agent[]>([]);`
  - Filter logic: `mode === "subagent" || mode === "all"`
  - Export in return object

- [x] **Task 1.2**: Create `MentionSuggestion` type
  - File: `src/types/opencode.ts`
  - Union type for agent/file suggestions
  - Include display properties (`label`, `description`)

- [x] **Task 1.3**: Implement `searchAgents` function
  - File: `src/app/index.tsx` (near line 1285)
  - Filter by name/description match
  - Return formatted `MentionSuggestion[]`
  - Limit to 5 results

- [x] **Task 1.4**: Update @ trigger logic
  - File: `src/app/index.tsx:1285-1300`
  - Replace `setFileSuggestions` with `setMentionSuggestions`
  - Call both `searchAgents` and `searchFiles` in parallel
  - Merge with agents first

- [x] **Task 1.5**: Update suggestion UI rendering
  - File: `src/app/index.tsx` (existing suggestion list location)
  - Rename `showFileSuggestions` → `showMentionSuggestions`
  - Distinguish agent vs file visually
  - Add `(agent)` label in muted color

- [x] **Task 1.6**: Implement `handleMentionSelect`
  - File: `src/app/index.tsx`
  - Handle both agent and file types
  - Insert with trailing space
  - Clear suggestions and refocus input

- [x] **Task 1.7**: Add styling for agent suggestions
  - File: `src/app/globals.css`
  - Border accent for agents
  - Muted description text

### Validation

- [ ] Type `@` → see subagents listed first
- [ ] Type `@gen` → filter to "general" agent
- [ ] Select agent → inserts `@general ` in input
- [ ] Type `@src` → see files after agents
- [ ] Verify primary agents excluded from @ completion
- [ ] Test with no query (empty `@`) → shows all subagents
- [ ] Check agent spawns task when message sent (server-side, no UI change needed)

### External References

- **TUI agent completion**: https://github.com/sst/opencode/blob/main/packages/tui/internal/completions/agents.go#L21-L66
- **TUI trigger handler**: https://github.com/sst/opencode/blob/main/packages/tui/internal/tui/tui.go#L1555
- **TUI agent picker (subagent exclusion)**: https://github.com/sst/opencode/blob/main/packages/tui/internal/components/dialog/agents.go#L229-L237
- **Desktop mention pattern**: https://github.com/sst/opencode/blob/main/packages/desktop/src/components/prompt-form-helpers.ts#L43-L52
- **Task tool invocation**: https://github.com/sst/opencode/blob/main/packages/opencode/src/tool/task.ts#L27-L30

---

## Issue #34: Session Deletion UX Polish

### Context & Rationale

**Problem**: Session deletion uses `window.confirm` with no context, no bulk actions, delete buttons look aggressive at rest.

**Upstream Behavior**: TUI calls `DeleteSession` per ID with toast feedback. Server only exposes `DELETE /session/:id` (no bulk endpoint).

**Key Insight**: Client-side iteration for bulk operations + controlled dialogs for better UX.

### Technical Approach

#### Replace window.confirm with Controlled Dialog

**File**: `src/app/index.tsx` (search for `window.confirm` calls)

**Before**:
```typescript
const handleDelete = (id: string) => {
  if (window.confirm("Delete this session?")) {
    deleteSession(id);
  }
};
```

**After**: Use existing Dialog component with session context

```typescript
const [deleteDialogState, setDeleteDialogState] = useState<{
  open: boolean;
  sessionId?: string;
  sessionTitle?: string;
}>({ open: false });

const handleDeleteClick = (session: Session) => {
  setDeleteDialogState({
    open: true,
    sessionId: session.id,
    sessionTitle: session.title || session.id.slice(0, 8),
  });
};

const confirmDelete = async () => {
  if (!deleteDialogState.sessionId) return;
  
  try {
    await deleteSession(deleteDialogState.sessionId);
    // Success handled by existing refresh logic
  } catch (error) {
    console.error("Failed to delete session:", error);
    // Could add toast here
  } finally {
    setDeleteDialogState({ open: false });
  }
};
```

**Dialog JSX**:
```tsx
<Dialog open={deleteDialogState.open} onClose={() => setDeleteDialogState({ open: false })}>
  <View className="delete-dialog">
    <h3>Delete Session</h3>
    <p>
      Are you sure you want to delete "{deleteDialogState.sessionTitle}"?
      This action cannot be undone.
    </p>
    <View className="dialog-actions">
      <Button variant="neutral" onClick={() => setDeleteDialogState({ open: false })}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={confirmDelete}>
        Delete
      </Button>
    </View>
  </View>
</Dialog>
```

#### Add Checkbox Selection to SessionPicker

**File**: `src/app/_components/ui/session-picker.tsx`

**State Management**:
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

const toggleSelection = (id: string, e: React.MouseEvent) => {
  e.stopPropagation(); // Prevent triggering onSelect
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
};

const selectAll = () => {
  setSelectedIds(new Set(sessions.map(s => s.id)));
};

const clearSelection = () => {
  setSelectedIds(new Set());
};
```

**UI Updates**:
```tsx
{/* Bulk action bar - show when selectedIds.size > 0 */}
{selectedIds.size > 0 && (
  <View className="bulk-actions">
    <span>{selectedIds.size} selected</span>
    <Button size="sm" variant="neutral" onClick={clearSelection}>
      Clear
    </Button>
    <Button size="sm" variant="destructive" onClick={handleBulkDeleteClick}>
      Delete Selected
    </Button>
  </View>
)}

{/* Session list item */}
<div className="session-item">
  <Checkbox
    checked={selectedIds.has(session.id)}
    onChange={(e) => toggleSelection(session.id, e)}
    onClick={(e) => e.stopPropagation()}
  />
  <div onClick={() => onSelect(session.id)}>
    {/* existing session content */}
  </div>
  <Button
    variant="ghost"
    size="sm"
    onClick={() => handleSingleDeleteClick(session)}
    className="delete-button-neutral"
  >
    Delete
  </Button>
</div>
```

#### Implement Bulk Delete Handler

**File**: `src/app/index.tsx`

```typescript
const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);

const handleBulkDeleteClick = (ids: Set<string>) => {
  setBulkDeleteIds(Array.from(ids));
  setBulkDeleteDialogOpen(true);
};

const confirmBulkDelete = async () => {
  const results = await Promise.allSettled(
    bulkDeleteIds.map((id) => deleteSession(id))
  );
  
  const failures = results.filter(r => r.status === "rejected");
  
  if (failures.length > 0) {
    console.error(`Failed to delete ${failures.length} sessions`);
    // Could show toast with failure count
  }
  
  // Refresh session list
  await loadSessions();
  
  setBulkDeleteDialogOpen(false);
  setBulkDeleteIds([]);
};
```

**Bulk Delete Dialog**:
```tsx
<Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)}>
  <View className="delete-dialog">
    <h3>Delete {bulkDeleteIds.length} Sessions</h3>
    <p>
      Are you sure you want to delete {bulkDeleteIds.length} selected session{bulkDeleteIds.length > 1 ? 's' : ''}?
      This action cannot be undone.
    </p>
    <View className="dialog-actions">
      <Button variant="neutral" onClick={() => setBulkDeleteDialogOpen(false)}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={confirmBulkDelete}>
        Delete All
      </Button>
    </View>
  </View>
</Dialog>
```

#### Style Delete Buttons with Neutral Variants

**File**: `src/app/globals.css`

```css
.delete-button-neutral {
  color: var(--theme-foreground);
  opacity: 0.6;
}

.delete-button-neutral:hover {
  opacity: 1;
  color: var(--theme-error, #ef4444);
  background-color: color-mix(in srgb, var(--theme-error, #ef4444) 10%, transparent);
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--theme-surface);
  border-bottom: 1px solid var(--theme-border);
}
```

### Implementation Tasks

- [x] **Task 2.1**: Create delete confirmation dialog state
  - File: `src/app/index.tsx`
  - Add state: `deleteDialogState` with `{ open, sessionId, sessionTitle }`
  - Replace all `window.confirm` calls with state updates

- [x] **Task 2.2**: Implement single delete dialog UI
  - File: `src/app/index.tsx`
  - Use existing Dialog component
  - Show session title/ID in message
  - Cancel/Delete actions

- [x] **Task 2.3**: Add checkbox selection to SessionPicker
  - File: `src/app/_components/ui/session-picker.tsx`
  - State: `selectedIds` Set
  - Checkbox component per session
  - Stop propagation to prevent select-on-check

- [x] **Task 2.4**: Add bulk action bar to SessionPicker
  - File: `src/app/_components/ui/session-picker.tsx`
  - Show when `selectedIds.size > 0`
  - Display count, Clear, Delete Selected buttons
  - Pass selection to parent via callback

- [x] **Task 2.5**: Implement bulk delete handler
  - File: `src/app/index.tsx`
  - Use `Promise.allSettled` for parallel deletes
  - Report failures (console or toast)
  - Refresh sessions after completion

- [x] **Task 2.6**: Create bulk delete confirmation dialog
  - File: `src/app/index.tsx`
  - Show count in message
  - Confirm before `Promise.allSettled` loop

- [x] **Task 2.7**: Style delete buttons with neutral variant
  - File: `src/app/globals.css`
  - Neutral color at rest (opacity 0.6)
  - Red on hover with background tint
  - Apply to both single and bulk delete buttons

### Validation

- [ ] Click delete on single session → shows dialog with session title
- [ ] Cancel dialog → no deletion occurs
- [ ] Confirm delete → session removed, dialog closes
- [ ] Check 3 sessions → bulk action bar appears with count
- [ ] Click "Delete Selected" → shows bulk confirmation dialog
- [ ] Confirm bulk delete → all 3 sessions deleted
- [ ] Verify delete button is neutral gray, turns red on hover
- [ ] Test failure handling: disconnect network, try delete, verify error logged

### External References

- **TUI delete flow**: https://github.com/sst/opencode/blob/main/packages/tui/internal/app/app.go#L916-L923
- **TUI session dialog delete**: https://github.com/sst/opencode/blob/main/packages/tui/internal/components/dialog/session.go#L324-L333
- **Server API docs**: https://github.com/sst/opencode/blob/main/packages/web/src/content/docs/server.mdx (DELETE /session/:id)

---

## Issue #15: Token Usage Mismatch vs CLI

### Context & Rationale

**Problem**: Web client sums token counts from every message render, leading to inflated totals vs CLI.

**Upstream Behavior**: TUI/Desktop aggregate session-scoped totals by reading `last().tokens`, skipping summaries. CLI shows consolidated session metric, not per-message sum.

**Key Insight**: Track session-level totals with message ID deduplication to avoid double counting from SSE replays.

**Current Bug**: Web client has TWO locations calculating tokens via `messages.reduce()`:

1. **`useOpenCode.ts:774-784`** (loadMessages callback):
   - Calculates for debug logging only (`console.log` at line 786-796)
   - Only runs during initial session load
   - **Action**: Keep for logging, doesn't affect UI

2. **`src/app/index.tsx:1447-1469`** (sessionTokenStats memo):
   - **This is the bug** - UI calculation using `messages.reduce()`
   - Re-sums all messages on every render when `messages` changes
   - Doesn't account for SSE replays (could double count)
   - Missing cache.read and cache.write fields
   - Doesn't match TUI's session-scoped aggregation
   - **Action**: Replace with sessionUsage lookup

### Technical Approach

#### Session-Level Usage Tracking

**File**: `src/hooks/useOpenCode.ts`

**Current Behavior** (approximate location near message handling):
```typescript
// Messages are accumulated from SSE events
// Token counts calculated in UI via messages.reduce()
```

**New Approach**: Add session-keyed usage cache

```typescript
interface SessionUsageTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  lastMessageId?: string;
}

const [sessionUsage, setSessionUsage] = useState<Map<string, SessionUsageTotals>>(
  new Map()
);

// In SSE message handler
const handleMessageUpdate = (msg: Message) => {
  // ... existing message update logic ...
  
  // Update session usage if tokens present
  if (msg.metadata?.tokens && currentSessionId) {
    setSessionUsage(prev => {
      const current = prev.get(currentSessionId) || {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
      };
      
      // Only update if this is a new message ID to avoid SSE replay double counting
      if (msg.id !== current.lastMessageId && msg.role === "assistant") {
        const tokens = msg.metadata.tokens;
        return new Map(prev).set(currentSessionId, {
          input: current.input + (tokens.input || 0),
          output: current.output + (tokens.output || 0),
          cacheRead: current.cacheRead + (tokens.cacheRead || 0),
          cacheWrite: current.cacheWrite + (tokens.cacheWrite || 0),
          lastMessageId: msg.id,
        });
      }
      
      return prev;
    });
  }
};
```

#### Expose Usage Totals via Hook

**File**: `src/hooks/useOpenCode.ts` (return object)

```typescript
return {
  // ... existing returns ...
  sessionUsage: currentSessionId 
    ? sessionUsage.get(currentSessionId) 
    : null,
};
```

#### Update UI to Read from Cache

**File**: `src/app/index.tsx` (or wherever token totals are displayed)

**Before**:
```typescript
const totalTokens = messages.reduce((sum, msg) => {
  return sum + (msg.metadata?.tokens?.input || 0) + (msg.metadata?.tokens?.output || 0);
}, 0);
```

**After**:
```typescript
const { sessionUsage } = useOpenCode();

const totalInput = sessionUsage?.input || 0;
const totalOutput = sessionUsage?.output || 0;
const totalCache = (sessionUsage?.cacheRead || 0) + (sessionUsage?.cacheWrite || 0);

// Format with compact notation (matching Desktop)
const formatter = new Intl.NumberFormat('en-US', { notation: 'compact' });
const displayTotal = formatter.format(totalInput + totalOutput);
```

#### Development Assertion for Regression Detection

**File**: `src/app/index.tsx` (wrapped in dev check)

```typescript
if (process.env.NODE_ENV !== "production") {
  // Compare cached total with naive reducer for drift detection
  const reducerTotal = messages.reduce((sum, msg) => {
    if (msg.role !== "assistant") return sum;
    return sum + (msg.metadata?.tokens?.input || 0) + (msg.metadata?.tokens?.output || 0);
  }, 0);
  
  const cachedTotal = (sessionUsage?.input || 0) + (sessionUsage?.output || 0);
  
  if (Math.abs(reducerTotal - cachedTotal) > 100) {
    console.warn(
      `[DEV] Token count drift detected: reducer=${reducerTotal}, cached=${cachedTotal}`,
      { sessionUsage, messageCount: messages.length }
    );
  }
}
```

### Implementation Tasks

- [x] **Task 3.0**: Fix token schema type definition (PREREQUISITE)
  - File: `src/lib/opencode-events.ts:98-102`
  - Update `MessageUpdatedEvent.properties.info.tokens` to include cache fields
  - **Before**:
    ```typescript
    tokens?: {
      input: number;
      output: number;
      reasoning: number;
    };
    ```
  - **After**:
    ```typescript
    tokens?: {
      input: number;
      output: number;
      reasoning: number;
      cache?: {
        read: number;
        write: number;
      };
    };
    ```
  - Rationale: Desktop client proves server sends these fields; Web needs to recognize them

- [x] **Task 3.1**: Add `SessionUsageTotals` type
  - File: `src/types/opencode.ts`
  - Interface with full token breakdown:
    ```typescript
    export interface SessionUsageTotals {
      input: number;
      output: number;
      reasoning: number;
      cacheRead: number;
      cacheWrite: number;
      totalTokens: number;     // Computed sum for display
      lastMessageId?: string;  // For deduplication
    }
    ```

- [x] **Task 3.2**: Add `sessionUsage` state to useOpenCode
  - File: `src/hooks/useOpenCode.ts`
  - Add state near other session-related state (after line ~400):
    ```typescript
    const [sessionUsage, setSessionUsage] = useState<Map<string, SessionUsageTotals>>(new Map());
    ```
  - Initialize empty Map

- [x] **Task 3.3**: Update SSE `message.updated` handler
  - File: `src/hooks/useOpenCode.ts` (around line 1100-1150, inside `message.updated` case)
  - Add token aggregation logic AFTER existing message state update
  - Deduplication: Only aggregate if `messageInfo.id` NOT in current session's `lastMessageId`
  - Filter: Only aggregate `assistant` role messages (skip `user` messages)
  - Implementation:
    ```typescript
    // After existing message update logic in case "message.updated":
    if (messageInfo.tokens && messageInfo.role === "assistant" && currentSessionId) {
      setSessionUsage((prev) => {
        const current = prev.get(currentSessionId) || {
          input: 0,
          output: 0,
          reasoning: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
        };
        
        // Skip if we've already counted this message
        if (messageInfo.id === current.lastMessageId) {
          return prev;
        }
        
        const tokens = messageInfo.tokens;
        const newTotals: SessionUsageTotals = {
          input: current.input + (tokens.input || 0),
          output: current.output + (tokens.output || 0),
          reasoning: current.reasoning + (tokens.reasoning || 0),
          cacheRead: current.cacheRead + (tokens.cache?.read || 0),
          cacheWrite: current.cacheWrite + (tokens.cache?.write || 0),
          totalTokens: 0, // Computed below
          lastMessageId: messageInfo.id,
        };
        
        newTotals.totalTokens = 
          newTotals.input + 
          newTotals.output + 
          newTotals.reasoning + 
          newTotals.cacheRead + 
          newTotals.cacheWrite;
        
        const next = new Map(prev);
        next.set(currentSessionId, newTotals);
        return next;
      });
    }
    ```

- [x] **Task 3.4**: Clear session usage on session deletion/switch
  - File: `src/hooks/useOpenCode.ts`
  - In `deleteSession`: Remove session from Map after deletion succeeds
  - In `switchSession`: Keep existing totals (they're keyed by session ID)
  - In `createSession`: Session starts with no entry (defaults to 0)
  - In `session.deleted` SSE handler: Remove from Map when `seenMessageIdsRef.current.clear()` is called

- [x] **Task 3.5**: Expose sessionUsage in hook return
  - File: `src/hooks/useOpenCode.ts` (return object, around line 2900)
  - Add to return statement:
    ```typescript
    sessionUsage: currentSession?.id 
      ? sessionUsage.get(currentSession.id) || null 
      : null,
    ```

- [x] **Task 3.6**: Update UI to read from sessionUsage
  - File: `src/app/index.tsx:1447-1469`
  - **Find existing `sessionTokenStats` memo**:
    ```typescript
    const sessionTokenStats = useMemo(() => {
      const totalTokens = messages.reduce((sum, msg) => {
        if (msg.metadata?.tokens) {
          return (
            sum +
            msg.metadata.tokens.input +
            msg.metadata.tokens.output +
            msg.metadata.tokens.reasoning
          );
        }
        return sum;
      }, 0);

      const contextWindow = 200000;
      const contextPercentage =
        contextWindow > 0 ? Math.round((totalTokens / contextWindow) * 100) : 0;

      return {
        totalTokens,
        contextPercentage,
        contextWindow,
      };
    }, [messages]);
    ```
  - **Replace with**:
    ```typescript
    const sessionTokenStats = useMemo(() => {
      // Read from session-scoped cache instead of reducing messages
      const totalTokens = sessionUsage?.totalTokens || 0;

      const contextWindow = 200000;
      const contextPercentage =
        contextWindow > 0 ? Math.round((totalTokens / contextWindow) * 100) : 0;

      return {
        totalTokens,
        contextPercentage,
        contextWindow,
        // Optionally expose breakdown for future UI enhancements
        breakdown: sessionUsage ? {
          input: sessionUsage.input,
          output: sessionUsage.output,
          reasoning: sessionUsage.reasoning,
          cacheRead: sessionUsage.cacheRead,
          cacheWrite: sessionUsage.cacheWrite,
        } : null,
      };
    }, [sessionUsage]);
    ```
  - **Note**: Display code at line 2529-2534 already uses `sessionTokenStats.totalTokens.toLocaleString()` - no changes needed there
  - **Compact notation**: Desktop uses compact notation, but Web uses `toLocaleString()` - keep current formatting for now (can iterate)

- [x] **Task 3.7**: Add development assertion (OPTIONAL - for testing only)
  - File: `src/app/index.tsx` (inside sessionTokenStats memo, after sessionUsage lookup)
  - Add dev-only comparison to verify migration correctness:
    ```typescript
    if (process.env.NODE_ENV !== "production" && messages.length > 0) {
      // Old calculation (what we're replacing)
      const reducerTotal = messages.reduce((sum, msg) => {
        if (msg.type !== "assistant" || !msg.metadata?.tokens) return sum;
        const t = msg.metadata.tokens;
        return sum + t.input + t.output + t.reasoning; // Note: missing cache fields
      }, 0);
      
      // New calculation (from sessionUsage)
      const cachedTotal = sessionUsage?.totalTokens || 0;
      
      // Expected: cachedTotal >= reducerTotal because it includes cache tokens
      const diff = cachedTotal - reducerTotal;
      
      console.log(
        `[Token Tracking] Old=${reducerTotal}, New=${cachedTotal}, Diff=+${diff} (cache tokens)`,
        { 
          sessionId: currentSession?.id,
          breakdown: sessionUsage,
          messageCount: messages.length 
        }
      );
      
      // Warn if new total is LESS than old (shouldn't happen)
      if (diff < 0) {
        console.warn(
          `[Token Tracking] NEW TOTAL LOWER THAN OLD - possible regression!`,
          { reducerTotal, cachedTotal, diff }
        );
      }
    }
    ```
  - **Remove this assertion** after verifying the fix works correctly
  - **Expected behavior**: New total should be >= old total (due to cache fields)

### Validation

- [ ] **Basic Aggregation**: Send 3 messages in session → verify token count increments monotonically
- [ ] **SSE Replay Deduplication**: Test multiple scenarios:
  - **Scenario 1**: Refresh page mid-session → verify tokens don't double count
    - `loadMessages` clears `seenMessageIdsRef`, but `sessionUsage` Map persists
    - **Expected**: Token total stays same after refresh (no inflation)
  - **Scenario 2**: Network reconnect during active session
    - Open DevTools Network tab, throttle to "Offline", wait 5s, restore to "Online"
    - SSE client reconnects and may replay recent events
    - **Expected**: `SessionUsageTotals.lastMessageId` prevents double counting
  - **Scenario 3**: Send message, wait for response, refresh immediately
    - Tokens might arrive after page reload (race condition)
    - **Expected**: Token total eventually consistent after SSE reconnect
- [ ] **Session Isolation**: Switch to different session → verify new session starts at 0 tokens
- [ ] **Session Persistence**: Switch back to first session → verify original totals preserved (Map keyed by session ID)
- [ ] **CLI Alignment**: Compare Web total with CLI output:
  ```bash
  # Export session data
  opencode session export --id <session-id> --format json > /tmp/session.json
  
  # Check tokens in output (example path - verify actual JSON structure)
  cat /tmp/session.json | jq '.usage.total_tokens'
  ```
  - Web `sessionUsage.totalTokens` should match CLI total within 1% (allowing for rounding)
- [ ] **Drift Detection**: Check dev console for drift warnings during multi-message testing
  - If drift > 100 tokens, investigate message deduplication logic
- [ ] **Schema Completeness**: 
  - Verify cache.read and cache.write fields exist in SSE events (check Network tab)
  - If missing, server may not send them for all models (fallback to 0 is correct)
- [ ] **Assistant-Only Filtering**: 
  - Send user message → verify token count doesn't change (only assistant messages counted)
  - Matches TUI logic: `if assistant, ok := message.Info.(opencode.AssistantMessage)`

### Data Structures - Verified from Codebase

**Message ID Source**: Message IDs come from the OpenCode server via SSE `message.updated` events at `event.properties.info.id` (type: `string`). The Web client uses this server-provided ID directly and tracks seen IDs in `seenMessageIdsRef` to prevent duplicate processing during SSE replays.

**Current Token Schema** (Web client - `src/lib/opencode-events.ts:98-102`):
```typescript
tokens?: {
  input: number;
  output: number;
  reasoning: number;  // Extended thinking tokens (e.g., o1 models)
}
```

**Upstream Token Schema** (Desktop client - verified via `packages/desktop/src/components/session-timeline.tsx:309-318`):
```typescript
tokens: {
  input: number;
  output: number;
  reasoning: number;
  cache: {
    read: number;   // Cache hit tokens (not charged)
    write: number;  // Cache write tokens (prompt caching)
  }
}
```

**Schema Gap**: The Web client's `MessageUpdatedEvent` type definition is **missing** `cache.read` and `cache.write` fields. These fields ARE sent by the server (Desktop uses them), but Web's TypeScript types don't declare them. This means:
1. Runtime data includes cache tokens (they exist in `event.properties.info.tokens`)
2. TypeScript types don't reflect this (causes type errors if we try to access them)
3. **Action Required**: Update `src/lib/opencode-events.ts` type definition to match upstream schema

**Session Usage Deduplication Strategy**: 

The Web client already implements message deduplication via `seenMessageIdsRef` (Ref<Set<string>>). Analysis of SSE handler shows:

1. **Line 798-799** (loadMessages): `seenMessageIdsRef.current.clear(); loadedMessages.forEach(...add)`
   - Clears and repopulates on full message load
   
2. **Line 1092** (message.updated): `seenMessageIdsRef.current.add(messageInfo.id)`
   - Adds each new message ID as SSE events arrive
   
3. **Line 1130** (message.updated): `if (seenMessageIdsRef.current.has(messageInfo.id)) { return prevMessages; }`
   - **Guards against duplicate message creation**
   - This prevents the same message from being added twice to UI state

**Our Approach**: We CANNOT reuse `seenMessageIdsRef` directly for token deduplication because:
- `seenMessageIdsRef` tracks "messages added to UI state"
- Token updates can arrive AFTER initial message creation (metadata comes later)
- **Solution**: Track `lastMessageId` per session in `SessionUsageTotals` to deduplicate token aggregation separately

**Why separate tracking is needed**:
```
Event sequence:
1. message.updated (role=assistant, id=msg-1, tokens=null) → add to UI, NO tokens yet
2. message.updated (role=assistant, id=msg-1, tokens={...}) → update metadata, ADD tokens
3. SSE reconnect replays message.updated (id=msg-1, tokens={...}) → DON'T re-add tokens

seenMessageIdsRef prevents #1 from creating duplicate UI messages
SessionUsageTotals.lastMessageId prevents #3 from double-counting tokens
```

### External References

- **TUI token aggregation**: https://github.com/sst/opencode/blob/main/packages/tui/internal/components/chat/messages.go#L879-L907
- **Desktop compact format**: https://github.com/sst/opencode/blob/main/packages/desktop/src/components/session-timeline.tsx#L298-L315
- **Upstream docs (server)**: https://github.com/sst/opencode/blob/main/packages/web/src/content/docs/server.mdx

---

## Implementation Sequence & Dependencies

### Phase 1: Foundation (Parallel)
All three issues are independent and can be worked simultaneously.

**Recommended Order** (if sequential):
1. **Issue #15** (Token usage) - Lowest risk, pure data tracking
2. **Issue #23** (@ mentions) - Medium complexity, new UI behavior
3. **Issue #34** (Session deletion) - Most UI changes, builds on existing patterns

### Phase 2: Integration Testing

- [ ] Test all three features together in single session
- [ ] Verify no interaction conflicts (e.g., @ completion doesn't break session deletion dialogs)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness (all features work on mobile layout)

### Phase 3: Validation & Polish

- [ ] Run full test suite: `bun run test` (if exists)
- [ ] Lint check: `bun run lint`
- [ ] Type check: `bun x tsc --noEmit`
- [ ] Manual QA against acceptance criteria in each issue
- [ ] Compare behavior with TUI/Desktop clients side-by-side

---

## Code Reference Index

### Internal Files

#### Modified Files
- `src/hooks/useOpenCode.ts:2394` - Agent filtering logic (Issue #23)
- `src/hooks/useOpenCode.ts` - Session usage tracking (Issue #15)
- `src/app/index.tsx:1285-1300` - @ trigger logic (Issue #23)
- `src/app/index.tsx` - Delete dialogs (Issue #34)
- `src/app/index.tsx` - Token display (Issue #15)
- `src/app/_components/ui/session-picker.tsx` - Checkbox selection (Issue #34)
- `src/types/opencode.ts` - Type definitions (all issues)
- `src/app/globals.css` - Styling (Issues #23, #34)

#### Reference Files (Read-Only)
- `src/app/_components/ui/dialog.tsx` - Existing Dialog component
- `src/app/_components/ui/checkbox.tsx` - Existing Checkbox component
- `src/app/_components/ui/button.tsx` - Button variants

### External Repository References

All references from `sst/opencode` monorepo:

#### Issue #23 References
- Agent completion provider: https://github.com/sst/opencode/blob/main/packages/tui/internal/completions/agents.go#L21-L66
- Trigger handler: https://github.com/sst/opencode/blob/main/packages/tui/internal/tui/tui.go#L1555
- Agent picker logic: https://github.com/sst/opencode/blob/main/packages/tui/internal/components/dialog/agents.go#L229-L237
- Mention pattern regex: https://github.com/sst/opencode/blob/main/packages/desktop/src/components/prompt-form-helpers.ts#L43-L52
- Desktop search implementation: https://github.com/sst/opencode/blob/main/packages/desktop/src/components/prompt-form-hooks.ts#L62-L78
- Task tool invocation: https://github.com/sst/opencode/blob/main/packages/opencode/src/tool/task.ts#L27-L30
- Agent documentation: https://github.com/sst/opencode/blob/main/packages/web/src/content/docs/agents.mdx#L7-L86

#### Issue #34 References
- TUI delete flow: https://github.com/sst/opencode/blob/main/packages/tui/internal/app/app.go#L916-L923
- Session dialog delete: https://github.com/sst/opencode/blob/main/packages/tui/internal/components/dialog/session.go#L324-L333
- Server API documentation: https://github.com/sst/opencode/blob/main/packages/web/src/content/docs/server.mdx (DELETE /session/:id table row)

#### Issue #15 References
- TUI token aggregation: https://github.com/sst/opencode/blob/main/packages/tui/internal/components/chat/messages.go#L879-L907
- Desktop compact formatting: https://github.com/sst/opencode/blob/main/packages/desktop/src/components/session-timeline.tsx#L298-L315

---

## Testing Strategy

### Unit Testing (If Test Suite Exists)

```typescript
// Test agent filtering
describe("searchAgents", () => {
  it("filters subagents by name", () => {
    const agents = [
      { name: "general", mode: "subagent" },
      { name: "primary", mode: "primary" },
    ];
    const results = searchAgents("gen", agents);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("general");
  });
});

// Test session usage aggregation
describe("sessionUsage", () => {
  it("deduplicates message ID on SSE replay", () => {
    const totals = { input: 100, output: 50, lastMessageId: "msg-1" };
    // Replay same message → no change
    const updated = updateUsage(totals, { id: "msg-1", tokens: { input: 100 } });
    expect(updated.input).toBe(100);
  });
});

// Test bulk delete
describe("handleBulkDelete", () => {
  it("reports failures without stopping", async () => {
    const mockDelete = jest.fn()
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error("Network"));
    
    await handleBulkDelete(["id1", "id2"], mockDelete);
    expect(mockDelete).toHaveBeenCalledTimes(2);
  });
});
```

### Manual Testing Checklist

#### Issue #23: @ Mentions
- [ ] Type `@` in empty composer → shows all subagents
- [ ] Type `@gen` → filters to "general" agent
- [ ] Type `@src` → shows agents matching "src" + files
- [ ] Select agent from list → inserts `@general ` with space
- [ ] Delete `@` → suggestion list disappears
- [ ] Verify primary agents NOT shown in @ completion
- [ ] Send message with `@general do X` → verify task spawned (check server logs)

#### Issue #34: Session Deletion
- [ ] Click delete on session → dialog shows title
- [ ] Click Cancel → dialog closes, no deletion
- [ ] Click Delete → session removed, list refreshes
- [ ] Check 1 session → bulk bar shows "1 selected"
- [ ] Check 5 sessions → bulk bar shows "5 selected"
- [ ] Click "Delete Selected" → bulk dialog shows count
- [ ] Confirm bulk delete → all selected sessions deleted
- [ ] Verify delete button neutral gray → red on hover
- [ ] Test with network offline → verify failure logged

#### Issue #15: Token Usage
- [ ] Send message → token count increases
- [ ] Refresh page → count doesn't double
- [ ] Switch session → new session starts at 0
- [ ] Switch back → original session shows same total
- [ ] Export session with CLI: `opencode session export --id <id> --format json`
- [ ] Compare Web total with CLI `usage.total_tokens` → should match within ~5%
- [ ] Check dev console → no drift warnings (< 100 token difference)

---

## Rollback Plan

All changes are additive and isolated. Rollback steps:

1. **Issue #23**: Remove `subagents` state, revert `@` trigger to only `searchFiles`
2. **Issue #34**: Restore `window.confirm`, remove checkbox/bulk logic
3. **Issue #15**: Revert to `messages.reduce()` calculation

No database migrations or server changes required.

---

## Success Metrics

- [ ] Zero TypeScript errors after `bun x tsc --noEmit`
- [ ] Zero lint errors after `bun run lint`
- [ ] All validation checklists completed
- [ ] Manual comparison with TUI confirms matching behavior
- [ ] No performance regression (check session list render time)
- [ ] Token totals within 5% of CLI export output

---

## Open Questions & Decisions

### Resolved
1. **Message ID Format** ✅ - Server-provided via `event.properties.info.id`, tracked in `seenMessageIdsRef`
2. **Token Schema** ✅ - Desktop proves `cache.read` and `cache.write` exist; Web types need update
3. **Deduplication Strategy** ✅ - Reuse existing `seenMessageIdsRef` pattern for session usage tracking

### Pending
1. **Toast notifications**: Should we add toast feedback for delete success/failure?
   - TUI shows toasts
   - Web has `showToast` utility (used in session.deleted handler)
   - **Recommendation**: Add toast for bulk delete failures (silent success is fine)
   
2. **Cache token display**: Should we show cache.read/write separately in UI?
   - Desktop shows them in total only
   - Could show breakdown in hover tooltip for power users
   - **Recommendation**: Include in total for now, add breakdown in future iteration
   
3. **Keyboard shortcuts**: Should bulk select support Cmd+A / Ctrl+A?
   - Low priority, can iterate
   - **Recommendation**: Defer to future PR

4. **Analytics**: Should we track @ mention usage vs file mentions?
   - No analytics infrastructure exists
   - **Recommendation**: Out of scope

---

## Appendix: API Endpoints Used

### Existing Endpoints (No Changes)
- `GET /agents` - Fetch all agents (Issue #23)
- `DELETE /session/:id` - Delete single session (Issue #34)
- SSE `/events` - Message stream includes `metadata.tokens` (Issue #15)

### No New Endpoints Required
All features use existing server APIs. Client-side only changes.
