# Stop Agent Feature Implementation Plan

**Issue**: [#18 - Add the ability to interrupt agent](https://github.com/sst/opencode-web/issues/18)  
**Date**: 2025-01-24  
**Status**: Planning Complete - Ready for Implementation

## Executive Summary

Users currently have no way to stop an agent that is "going off the rails" - they must wait for it to complete. This plan implements a "Stop" button that leverages the existing `/session/:id/abort` endpoint in the opencode server to interrupt running agents.

**Key Insight**: The server already has full abort support via `SessionLock.abort()` which triggers AbortController signals throughout the agent execution pipeline. We just need to expose this capability in the web UI with proper state tracking via SSE events.

---

## Technical Context

### Server-Side Architecture (Existing)

The opencode server already implements session interruption:

1. **Lock Mechanism** (`packages/opencode/src/session/lock.ts`)
   - Every agent run acquires a `SessionLock` with an `AbortController`
   - `SessionLock.abort(sessionID)` triggers the abort signal
   - Lock releases automatically via `Symbol.dispose` when done

2. **Abort Endpoint** (`packages/opencode/src/server/server.ts:586-598`)
   ```typescript
   POST /session/:id/abort
   // Returns boolean indicating if abort was successful
   SessionLock.abort(c.req.valid("param").id)
   ```

3. **SSE Events** (emitted during session lifecycle)
   - `session.idle` - Emitted when session lock releases (success/error/abort)
   - `session.error` - Emitted on errors (including abort errors)
   - `message.updated` - Emitted for message state changes with completion info

### Client-Side Architecture (Current State)

**Existing Infrastructure**:
- `src/lib/opencode-http-api.ts:190-204` - `abortSession()` HTTP call exists
- `src/lib/opencode-server-fns.ts:93-97` - Server function wrapper exists
- `src/lib/opencode-client.ts:198-207` - Service method exists
- `src/lib/opencode-events.ts:68-73` - `SessionIdleEvent` type exists
- `src/hooks/useOpenCode.ts:750-1129` - SSE event handler processes events

**Missing Infrastructure**:
- No state tracking for session busy/running status
- No UI controls to trigger abort
- No optimistic loading state during abort
- No error handling/retry for failed aborts

---

## Implementation Plan

### Phase 1: State Management Layer

#### Task 1.1: Add Session Activity State to useOpenCode Hook

**File**: `src/hooks/useOpenCode.ts`

**Location**: Add state declarations around line 220 (after existing useState declarations)

- [x] Add state for tracking active sessions
  ```typescript
  const [sessionActivity, setSessionActivity] = useState<
    Record<string, { running: boolean; lastUpdated: number }>
  >({})
  const [abortInFlight, setAbortInFlight] = useState(false)
  ```

- [x] Add derived state for current session
  ```typescript
  const currentSessionBusy = useMemo(() => {
    if (!currentSession?.id) return false
    return sessionActivity[currentSession.id]?.running ?? false
  }, [currentSession?.id, sessionActivity])
  ```

**Validation**: 
- TypeScript compiles without errors
- State initializes as empty object
- Derived boolean returns false when no session active

---

#### Task 1.2: Create Helper Functions for Activity Tracking

**File**: `src/hooks/useOpenCode.ts`

**Location**: Add after state declarations (around line 230)

- [x] Add function to mark session as running
  ```typescript
  const markSessionRunning = useCallback((sessionId: string) => {
    setSessionActivity(prev => ({
      ...prev,
      [sessionId]: { running: true, lastUpdated: Date.now() }
    }))
  }, [])
  ```

- [x] Add function to mark session as idle
  ```typescript
  const markSessionIdle = useCallback((sessionId: string) => {
    setSessionActivity(prev => ({
      ...prev,
      [sessionId]: { running: false, lastUpdated: Date.now() }
    }))
  }, [])
  ```

- [x] Add cleanup function for deleted sessions
  ```typescript
  const cleanupSessionActivity = useCallback((sessionId: string) => {
    setSessionActivity(prev => {
      const next = { ...prev }
      delete next[sessionId]
      return next
    })
  }, [])
  ```

**Validation**:
- Functions properly update state
- Cleanup removes keys from state object
- Multiple rapid calls don't cause race conditions

---

#### Task 1.3: Integrate Activity Tracking into sendMessage

**File**: `src/hooks/useOpenCode.ts`

**Location**: Modify `sendMessage` function (starts around line 1328)

- [x] Mark session running before API call
  ```typescript
  // After: if (!targetSession) throw...
  // Add:
  markSessionRunning(targetSession.id)
  ```

- [x] Ensure cleanup in finally block
  ```typescript
  // Modify existing finally block to NOT mark idle here
  // SSE events will handle marking idle
  finally {
    setLoading(false)
    // DO NOT call markSessionIdle here - let SSE handle it
  }
  ```

- [x] Add error case handling
  ```typescript
  // In catch block before throw
  catch (error) {
    console.error("Failed to send message:", error)
    // Mark idle on immediate failure (before server processing)
    markSessionIdle(targetSession.id)
    throw new Error(handleOpencodeError(error))
  }
  ```

**Rationale**: We mark running immediately when starting, but rely on SSE `session.idle` event to mark complete. This prevents race conditions where the HTTP response arrives before SSE events, and ensures accurate state even if the client loses connection mid-request.

**Validation**:
- Session marked running when message sent
- Session stays running during agent processing
- Session marked idle only via SSE (tested in Task 1.5)

---

#### Task 1.4: Integrate Activity Tracking into Other Agent Operations

**File**: `src/hooks/useOpenCode.ts`

Apply same pattern to:

- [x] `runShell` function (line 2168)
  - Add `markSessionRunning(sessionId)` at start
  - Add `markSessionIdle(sessionId)` in catch for immediate failures
  - Rely on SSE for completion

- [x] `initSession` function (line 2251)
  - Add `markSessionRunning(sessionId)` at start
  - Add `markSessionIdle(sessionId)` in catch for immediate failures
  - Rely on SSE for completion

- [x] `summarizeSession` function (line 2275)
  - Add `markSessionRunning(sessionId)` at start
  - Add `markSessionIdle(sessionId)` in catch for immediate failures
  - Rely on SSE for completion

**Note**: Commands executed via `handleCommand` in `src/app/index.tsx` eventually call these functions, so they'll automatically get tracking.

**Validation**:
- Each operation marks session running
- Failures before server processing mark idle immediately
- SSE events handle successful completion

---

#### Task 1.5: Enhance SSE Event Handler for Activity Tracking

**File**: `src/hooks/useOpenCode.ts`

**Location**: Modify `handleSSEEvent` function inside `useEffect` (around line 750-1090)

- [x] Handle `session.idle` event
  ```typescript
  // Add new case around line 1090
  case "session.idle": {
    const { sessionID } = event.properties
    if (sessionID) {
      markSessionIdle(sessionID)
      debugLog("[SSE] Session idle:", sessionID)
    }
    break
  }
  ```

- [x] Handle `session.error` event (already exists around line 860)
  ```typescript
  // Modify existing case to also mark idle
  case "session.error": {
    const { sessionID } = event.properties
    if (sessionID) {
      markSessionIdle(sessionID)
      // ... existing error handling
    }
    break
  }
  ```

- [x] Handle `session.deleted` event (already exists around line 820)
  ```typescript
  // Modify existing case to cleanup activity
  case "session.deleted": {
    const { info } = event.properties
    if (info?.id) {
      cleanupSessionActivity(info.id)
      // ... existing delete handling
    }
    break
  }
  ```

- [x] Add message completion detection
  ```typescript
  // Modify existing "message.updated" case (around line 900)
  case "message.updated": {
    const msgInfo = event.properties?.info
    
    // Existing logic...
    
    // Add: Detect when assistant message completes
    if (
      msgInfo?.role === "assistant" && 
      msgInfo?.time?.completed && 
      currentSessionRef.current?.id === msgInfo.sessionID
    ) {
      // Message completed but session might still be running other operations
      // Don't mark idle here - wait for session.idle event
      debugLog("[SSE] Assistant message completed:", msgInfo.id)
    }
    
    // ... rest of existing logic
  }
  ```

**Rationale**: The `session.idle` event is authoritative for when a session lock is released. We use it as the single source of truth to avoid race conditions between HTTP responses and SSE events.

**Validation**:
- Session marked idle when `session.idle` event received
- Session marked idle on error events
- Activity state cleaned up on session deletion
- No duplicate idle markings cause issues

---

#### Task 1.6: Create abortSession Function

**File**: `src/hooks/useOpenCode.ts`

**Location**: Add after other session operations (around line 2291, before return statement)

- [x] Implement abort function
  ```typescript
  const abortSession = useCallback(
    async (sessionId: string) => {
      try {
        setAbortInFlight(true)
        const response = await openCodeService.abortSession(
          sessionId,
          currentProject?.worktree,
        )
        
        if (response.error) {
          throw new Error(response.error)
        }
        
        // Don't mark idle here - wait for SSE session.idle event
        debugLog("[Abort] Session abort requested:", sessionId)
        
        return response.data
      } catch (error) {
        console.error("Failed to abort session:", error)
        throw error
      } finally {
        setAbortInFlight(false)
      }
    },
    [currentProject?.worktree],
  )
  ```

**Validation**:
- Function calls openCodeService.abortSession correctly
- Error handling works and preserves error messages
- abortInFlight state properly toggles

---

#### Task 1.7: Export New Values from Hook

**File**: `src/hooks/useOpenCode.ts`

**Location**: Modify return statement (around line 2293-2363)

- [x] Add new exports to return object
  ```typescript
  return {
    // ... existing exports
    
    // Add after summarizeSession (around line 2353):
    abortSession,
    currentSessionBusy,
    abortInFlight,
    sessionActivity, // Useful for debugging
    sseConnectionState,
    // ... rest of exports
  }
  ```

**Validation**:
- TypeScript compiles
- Return type inference includes new fields

---

### Phase 2: Context & Type Updates

#### Task 2.1: Update OpenCodeContext Type

**File**: `src/contexts/OpenCodeContext.tsx`

**Location**: Modify `OpenCodeContextType` interface (lines 4-73)

- [x] Add new type properties
  ```typescript
  interface OpenCodeContextType {
    // ... existing properties
    
    // Add after summarizeSession (around line 64):
    abortSession: ReturnType<typeof useOpenCode>["abortSession"];
    currentSessionBusy: ReturnType<typeof useOpenCode>["currentSessionBusy"];
    abortInFlight: ReturnType<typeof useOpenCode>["abortInFlight"];
    sessionActivity: ReturnType<typeof useOpenCode>["sessionActivity"];
    
    // ... existing properties
  }
  ```

**Validation**:
- TypeScript compiles
- Context provider automatically includes new values (via spreading `hookValue`)

---

### Phase 3: UI Implementation

#### Task 3.1: Add ESC Key Abort and Mobile Stop Button

**File**: `src/app/index.tsx`

**Location**: Modify input section and keyboard handling

- [x] Import abort function from context (top of component)
  ```typescript
  // Modify useOpenCodeContext destructuring (around line 291)
  const {
    // ... existing imports
    abortSession,
    currentSessionBusy,
    abortInFlight,
  } = useOpenCodeContext();
  ```

- [x] Create abort handler function (around line 403, after `handleSend`)
  ```typescript
  const handleAbort = async () => {
    if (!currentSession?.id || abortInFlight) return
    
    try {
      await abortSession(currentSession.id)
      
      const successMsg = {
        id: `assistant-${Date.now()}`,
        type: "assistant" as const,
        content: "Agent stopped by user.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, successMsg])
    } catch (error) {
      const errorMsg = {
        id: `assistant-${Date.now()}`,
        type: "assistant" as const,
        content: `Failed to stop agent: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    }
  }
  ```

- [x] Add ESC key handler for desktop abort
  ```typescript
  // Modify handleKeyDown function to add ESC handling:
  if (e.key === "Escape") {
    if (showCommandPicker) {
      e.preventDefault();
      setShowCommandPicker(false);
    } else if (showFileSuggestions) {
      e.preventDefault();
      setShowFileSuggestions(false);
    } else if (currentSessionBusy && !isMobile) {
      // On desktop, ESC aborts the running agent
      e.preventDefault();
      handleAbort();
    }
  }
  ```

- [x] Remove Send button entirely, add mobile-only Stop button
  ```typescript
  // Replace button section with:
  {currentSessionBusy && isMobile && (
    <div className="relative w-full">
      <Button
        variant="foreground0"
        box="square"
        size="large"
        onClick={handleAbort}
        disabled={abortInFlight}
        className="w-full text-white disabled:opacity-50"
        style={{
          backgroundColor: "var(--theme-error)",
          opacity: abortInFlight ? 0.7 : 1,
        }}
      >
        {abortInFlight ? "Stopping..." : "Stop Agent (ESC on desktop)"}
      </Button>
    </div>
  )}
  ```

- [x] Remove unused `composerHeight` state and `sendButtonDimensionStyle` variable
- [x] Remove unused `CSSProperties` import

**Validation**:
- ESC key aborts agent on desktop when running
- Mobile shows Stop Agent button when agent running
- Desktop has no visible button (cleaner UI)
- Enter key still sends messages as usual

---

#### Task 3.2: Add Running Status Indicator with ESC Hint

**File**: `src/app/index.tsx`

**Location**: Status bar with model/session info (around lines 2392-2450)

- [x] Add running indicator badge with ESC hint on desktop
  ```typescript
  // After the session button (around line 2429), add:
  {currentSessionBusy && (
    <>
      <span className="text-theme-muted">•</span>
      <Badge
        variant="foreground0"
        cap="round"
        className="flex items-center gap-1 animate-pulse"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
        Agent running {!isMobile && "(ESC to stop)"}
      </Badge>
    </>
  )}
  ```

**Validation**:
- Badge appears when agent is running
- Badge shows "(ESC to stop)" on desktop only
- Badge disappears when idle
- Animation provides visual feedback

---

#### Task 3.3: Update Input Placeholder with ESC Hint

**File**: `src/app/index.tsx`

**Location**: Textarea component (around line 2481)

- [x] Keep textarea always enabled (for future message queuing feature)
- [x] Add context-aware placeholder for desktop users
  ```typescript
  // Modify Textarea component:
  <Textarea
    value={input}
    onChange={(e) => handleInputChange(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder={
      currentSessionBusy && !isMobile
        ? "Agent running... Press ESC to stop, or type to queue a message"
        : "Type your message, Tab to switch agent, /models to select model..."
    }
    rows={2}
    size="large"
    className="w-full bg-theme-background text-theme-foreground border-theme-primary resize-none"
  />
  ```

**Rationale**: 
- Users discover ESC keyboard shortcut through placeholder text
- Prepares for future message queuing feature
- Different placeholder on mobile where ESC isn't available
- Input stays enabled so users can compose next message

**Validation**:
- Input always enabled regardless of agent state
- Desktop placeholder mentions ESC key when agent running
- Mobile placeholder doesn't mention ESC
- Placeholder returns to normal when agent idle

---

### Phase 4: Testing & Validation

#### Task 4.1: Manual Testing - Basic Flow

- [ ] Start dev server (`bun run dev`)
- [ ] Create new session
- [ ] Send a message that triggers long-running agent work
  - Suggestion: Ask agent to analyze a large codebase or perform complex task
- [ ] Verify "Stop Agent" button appears
- [ ] Verify status badge shows "Agent running"
- [ ] Verify input is disabled
- [ ] Click "Stop Agent"
- [ ] Verify button shows "Stopping..."
- [ ] Verify SSE `session.idle` event arrives
- [ ] Verify button returns to "Send"
- [ ] Verify status badge disappears
- [ ] Verify input re-enabled
- [ ] Verify confirmation message appears in chat

**Expected Result**: Agent stops mid-execution, UI returns to idle state, no errors in console.

---

#### Task 4.2: Manual Testing - Edge Cases

- [ ] **Rapid Abort**: Click Stop multiple times quickly
  - Expected: Button disabled during abort, no duplicate requests
  
- [ ] **Network Failure**: Disconnect network, click Stop
  - Expected: Error message shown to user, state eventually recovers
  
- [ ] **Session Switch**: Abort session A, switch to session B
  - Expected: Session A activity cleaned up, B has correct state
  
- [ ] **Completed Before Abort**: Send quick message, try to abort after completion
  - Expected: Stop button not visible if agent already idle
  
- [ ] **Multiple Sessions**: Have two browser tabs, abort in one
  - Expected: Both tabs receive SSE event and update correctly

---

#### Task 4.3: Regression Testing

- [ ] Normal message flow still works (send, receive, display)
- [ ] SSE events still update message parts correctly
- [ ] Switching sessions preserves message history
- [ ] Switching projects loads correct sessions
- [ ] Shell commands can still be executed
- [ ] Other session operations (share, revert, etc.) still work
- [ ] Hydration from localStorage still works on page reload

---

#### Task 4.4: Console Verification

Verify no errors appear for:

- [ ] `abortSession` function calls
- [ ] SSE event processing
- [ ] State updates during abort
- [ ] TypeScript compilation
- [ ] React rendering (no infinite loops)

**Check for**:
- Network tab shows `POST /session/:id/abort` with 200 response
- SSE stream shows `session.idle` event with correct sessionID
- Console logs show `[SSE] Session idle: <sessionID>` when using dev mode

---

### Phase 5: Polish & Documentation

#### Task 5.1: Add User-Facing Documentation

**File**: `README.md`

- [ ] Add section about stopping agents
  ```markdown
  ### Stopping Agent Execution
  
  If an agent is taking too long or behaving unexpectedly, you can stop it:
  
  1. Click the **Stop Agent** button that appears while the agent is running
  2. Wait for confirmation message
  3. The session will be in a safe state to continue with new prompts
  
  Note: Stopping an agent mid-execution may leave partial work. Review any 
  file changes before continuing.
  ```

**Validation**: Documentation is clear and accurate

---

#### Task 5.2: Add Developer Documentation

**File**: `CONTEXT/PLAN-stop-agent-feature-2025-01-24.md` (this file)

- [ ] Mark all completed tasks
- [ ] Add "Implementation Complete" section with:
  - Date completed
  - Files modified
  - Known limitations
  - Future enhancements

---

#### Task 5.3: Code Quality Review

- [ ] Remove any console.log statements (keep console.error and dev-guarded logs)
- [ ] Ensure all TypeScript types are properly defined
- [ ] Verify no `any` types introduced
- [ ] Check for unused imports
- [ ] Verify consistent code style with existing codebase
- [ ] Run linter: `bun run lint`
- [ ] Run type checker: `bun x tsc --noEmit`

---

### Phase 6: Commit & PR

#### Task 6.1: Prepare Commit

- [ ] Stage all modified files
  ```bash
  git add \
    src/hooks/useOpenCode.ts \
    src/contexts/OpenCodeContext.tsx \
    src/app/index.tsx \
    CONTEXT/PLAN-stop-agent-feature-2025-01-24.md \
    README.md
  ```

- [ ] Review changes
  ```bash
  git diff --staged
  ```

- [ ] Create commit with descriptive message
  ```bash
  git commit -m "feat: add ability to interrupt running agents

  - Add session activity state tracking in useOpenCode
  - Integrate with existing /session/:id/abort endpoint
  - Use SSE session.idle event for authoritative idle state
  - Add Stop Agent button that appears during execution
  - Disable input during agent execution to prevent queuing
  - Show running status badge for visual feedback
  - Handle abort errors gracefully with user feedback

  Closes #18"
  ```

**Validation**:
- Commit message follows conventional commits format
- All files included
- No unintended changes staged

---

#### Task 6.2: Create Pull Request

- [ ] Push branch to remote
  ```bash
  git push -u origin feat/stop-agent
  ```

- [ ] Create PR via GitHub CLI or web UI
  ```bash
  gh pr create --title "feat: Add ability to interrupt running agents" --body "$(cat <<'EOF'
  ## Summary
  - Implements Stop Agent button to interrupt long-running agent executions
  - Leverages existing `/session/:id/abort` server endpoint
  - Uses SSE `session.idle` event for state synchronization
  - Provides visual feedback during agent execution and abort

  ## Implementation Details
  - Added session activity tracking state to `useOpenCode` hook
  - Enhanced SSE event handler to process `session.idle`, `session.error` events
  - Created `abortSession` function exposed via context
  - Added Stop Agent UI button with loading states
  - Added running status badge
  - Disabled input during execution to prevent conflicts

  ## Testing
  - [x] Manual testing of basic abort flow
  - [x] Edge case testing (rapid clicks, network failures, session switches)
  - [x] Regression testing of existing functionality
  - [x] TypeScript compilation passes
  - [x] Linter passes

  Closes #18
  EOF
  )"
  ```

**Validation**:
- PR description is clear and complete
- References issue #18
- All CI checks pass

---

## File Reference Map

### Files Modified (Internal)

```
src/hooks/useOpenCode.ts (lines ~220-2363)
├── State management for session activity
├── Helper functions for activity tracking  
├── Integration into sendMessage, runShell, initSession, summarizeSession
├── SSE event handler enhancements
├── abortSession function implementation
└── Export additions

src/contexts/OpenCodeContext.tsx (lines 4-73)
└── Type additions for new context values

src/app/index.tsx (lines 291, 403, 2392-2560)
├── Import abort functions from context
├── handleAbort function
├── Stop/Send button conditional rendering
├── Running status badge
└── Input disable during execution

README.md (new section)
└── User documentation for stopping agents

CONTEXT/PLAN-stop-agent-feature-2025-01-24.md (this file)
└── Comprehensive implementation plan
```

### Files Referenced (Internal - No Changes)

```
src/lib/opencode-http-api.ts (lines 190-204)
└── Existing abortSession HTTP function

src/lib/opencode-server-fns.ts (lines 93-97)
└── Existing abortSession server function wrapper

src/lib/opencode-client.ts (lines 198-207)
└── Existing openCodeService.abortSession method

src/lib/opencode-events.ts (lines 68-73)
└── SessionIdleEvent type definition

src/types/opencode.ts
└── Type definitions for SSE events
```

### External References (opencode server)

```
https://github.com/sst/opencode/blob/dev/packages/opencode/src/session/lock.ts
└── SessionLock.acquire(), SessionLock.abort(), AbortController usage

https://github.com/sst/opencode/blob/dev/packages/opencode/src/session/prompt.ts
└── Session prompt execution with abort signals, session.idle event emission

https://github.com/sst/opencode/blob/dev/packages/opencode/src/server/server.ts#L586-L598
└── POST /session/:id/abort endpoint implementation

https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts#L1150-L1159
└── EventSessionIdle type definition
```

---

## Technical Specifications

### API Endpoint

**POST** `/session/:id/abort`

**Parameters**:
- `id` (path): Session ID to abort

**Query Parameters**:
- `directory` (optional): Project directory

**Response**:
```typescript
boolean  // true if abort was successful, false if session wasn't running
```

**Status Codes**:
- `200`: Abort attempted (check response body for success)
- `400`: Invalid session ID
- `404`: Session not found

---

### Data Models

#### Session Activity State

```typescript
type SessionActivity = Record<string, {
  running: boolean
  lastUpdated: number  // timestamp in milliseconds
}>
```

#### SSE Events Used

```typescript
// Session becomes idle (lock released)
type SessionIdleEvent = {
  type: "session.idle"
  properties: {
    sessionID: string
  }
}

// Session encountered error
type SessionErrorEvent = {
  type: "session.error"
  properties: {
    sessionID?: string
    error?: {
      type: string
      message: string
      [key: string]: unknown
    }
  }
}

// Session deleted
type SessionDeletedEvent = {
  type: "session.deleted"
  properties: {
    info?: {
      id: string
      [key: string]: unknown
    }
  }
}
```

---

### State Transition Diagram

```
[User sends message]
        ↓
  markSessionRunning(sessionId)
        ↓
  [HTTP POST to /session/:id/message]
        ↓
  ┌─────────────────────┐
  │  Agent Processing   │ ← [User clicks Stop] → [POST /session/:id/abort]
  │   (server-side)     │                               ↓
  └─────────────────────┘                    [AbortController triggered]
        ↓                                                ↓
  [Completion or Abort]                        [Agent halts execution]
        ↓                                                ↓
  [SSE: session.idle event] ←──────────────────────────┘
        ↓
  markSessionIdle(sessionId)
        ↓
  [UI returns to idle state]
```

---

## Configuration Requirements

No new configuration required. Feature uses existing:

- OpenCode server API endpoint
- SSE event stream connection
- Session/project directory routing

---

## Integration Points

### With Existing Systems

1. **SSE Event System** (`src/lib/opencode-events.ts`)
   - Listens for `session.idle`, `session.error`, `session.deleted`
   - Already connected and processing events
   - No changes to SSE client needed

2. **Session Management** (`src/hooks/useOpenCode.ts`)
   - Integrates with existing `sendMessage`, `runShell`, etc.
   - Uses same project/directory context
   - No breaking changes to existing APIs

3. **OpenCode Server** (external)
   - Uses existing `/session/:id/abort` endpoint
   - No server changes required
   - Backend handles abort via AbortController signals

---

## Known Limitations & Future Enhancements

### Current Limitations

1. **Partial Work**: Aborting mid-execution may leave partial file changes
   - **Mitigation**: Document that users should review changes after abort
   - **Future**: Could integrate with snapshot/revert system to rollback

2. **No Progress Indicator**: User doesn't know how far agent got before abort
   - **Future**: Could show last completed tool call or step

3. **Single Stop**: Can only abort current session, not multiple concurrent operations
   - **Rationale**: Server uses session-level locks, so this matches server behavior
   - **Future**: If server adds operation-level abort, we can enhance

### Future Enhancements

- [ ] Add "Abort and Revert" option that also reverts file changes
- [ ] Show partial results before abort (tool calls completed, tokens used)
- [ ] Add timeout warning (e.g., "Agent has been running for 5 minutes - consider stopping?")
- [ ] Add abort reason field (user can explain why they stopped)
- [ ] Persist abort events to session history for debugging

---

## Success Criteria

### Must Have (Phase 1-3)
- [x] Stop button appears when agent is running
- [x] Stop button triggers abort endpoint
- [x] UI returns to idle state after abort
- [x] No console errors during normal flow
- [x] TypeScript compiles without errors

### Should Have (Phase 4)
- [ ] All edge cases handled gracefully
- [ ] Regression tests pass
- [ ] User feedback messages are clear
- [ ] Visual indicators work correctly

### Nice to Have (Phase 5-6)
- [ ] Documentation complete
- [ ] Code quality checks pass
- [ ] PR created and reviewed

---

## Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: State Management | 1.1 - 1.7 | 2-3 hours |
| Phase 2: Context Updates | 2.1 | 30 minutes |
| Phase 3: UI Implementation | 3.1 - 3.3 | 1-2 hours |
| Phase 4: Testing | 4.1 - 4.4 | 2-3 hours |
| Phase 5: Polish | 5.1 - 5.3 | 1 hour |
| Phase 6: Commit & PR | 6.1 - 6.2 | 30 minutes |
| **Total** | | **7-10 hours** |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Race condition between HTTP and SSE | Medium | High | Use SSE as authoritative source for idle state |
| Abort doesn't actually stop agent | Low | High | Server already implements this - tested |
| UI state desync across tabs | Low | Medium | All tabs receive SSE events |
| Memory leak from activity state | Low | Medium | Cleanup on session deletion |
| User confusion about partial work | Medium | Low | Clear messaging in UI |

---

## Notes & Decisions

### Why SSE for State, Not HTTP Response?

**Decision**: Use `session.idle` SSE event as authoritative signal for when session stops, not the HTTP response from abort.

**Rationale**:
1. SSE events are emitted from the lock's `Symbol.dispose`, which is guaranteed to run
2. HTTP response arrives immediately but agent may still be cleaning up
3. Multiple operations (message send, abort, server-side cleanup) all result in same SSE event
4. Prevents race conditions where HTTP completes before SSE
5. Works even if client loses connection during abort (SSE reconnects and delivers event)

### Why Use ESC Key Instead of Stop Button on Desktop?

**Decision**: Remove Send button entirely, use ESC key for abort on desktop, show mobile-only Stop button.

**Rationale**:
1. Nobody uses the Send button - everyone presses Enter to send
2. ESC is a natural keyboard shortcut for "cancel/stop" operations
3. Cleaner UI with no buttons cluttering the input area on desktop
4. Mobile still needs visual button since ESC key not available
5. Aligns with message queuing feature - users type and press Enter to queue/send
6. Keyboard-first interface matches developer workflow

**Alternative Considered**: Show both Stop and Send buttons.
**Rejected Because**: Send button adds visual clutter when users already use Enter key. Stop button also clutters desktop UI when ESC is more natural.

**Benefits**:
- Minimal, clean interface on desktop (just textarea)
- Keyboard shortcuts feel natural (Enter = send, ESC = stop)
- Mobile users get visible button for discoverability
- Placeholder text teaches desktop users about ESC shortcut

### Why Show Running Badge?

**Decision**: Add animated "Agent running" badge to status bar.

**Rationale**:
1. Provides passive awareness without requiring action
2. Matches common UI patterns (loading spinners, progress indicators)
3. Helps user understand why Stop button appeared
4. No extra interaction required to see status

---

## Appendix: Code Snippets

### Complete handleAbort Implementation

```typescript
const handleAbort = async () => {
  if (!currentSession?.id || abortInFlight) return
  
  try {
    await abortSession(currentSession.id)
    
    const successMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: "Agent stopped by user.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, successMsg])
  } catch (error) {
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: `Failed to stop agent: ${error instanceof Error ? error.message : "Unknown error"}`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
  }
}
```

### Complete Session Activity Helpers

```typescript
const markSessionRunning = useCallback((sessionId: string) => {
  setSessionActivity(prev => ({
    ...prev,
    [sessionId]: { running: true, lastUpdated: Date.now() }
  }))
}, [])

const markSessionIdle = useCallback((sessionId: string) => {
  setSessionActivity(prev => ({
    ...prev,
    [sessionId]: { running: false, lastUpdated: Date.now() }
  }))
}, [])

const cleanupSessionActivity = useCallback((sessionId: string) => {
  setSessionActivity(prev => {
    const next = { ...prev }
    delete next[sessionId]
    return next
  })
}, [])
```

---

## Implementation Status

**Status**: Ready for implementation  
**Last Updated**: 2025-01-24  
**Next Steps**: Begin Phase 1, Task 1.1
