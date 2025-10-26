# Message Queuing Implementation Plan

**Issue**: [#25 - Add message queuing functionality to chat interface](https://github.com/kcrommett/opencode-web/issues/25)  
**Date**: 2025-01-26  
**Status**: Planning Phase

## Executive Summary

Implement message queuing functionality in the OpenCode Web chat interface to allow users to send multiple messages while an agent is responding. Messages will be queued and processed sequentially, matching the behavior of the TUI (Terminal User Interface).

## Problem Statement

Currently, the web chat interface blocks user input when an agent is responding. Users cannot queue additional messages for processing after the current response completes. This differs from the TUI experience and limits user productivity.

## Goals

1. Allow users to send messages while an agent is actively responding
2. Display queued messages with clear visual indicators
3. Process queued messages sequentially after current agent response completes
4. Provide the ability to cancel queued messages before processing
5. Show queue count feedback to users

## Technical Context

### Current Implementation Analysis

#### Message State Management
- Location: `src/hooks/useOpenCode.ts`
- Current state variables:
  - `messages: Message[]` (line 316) - Active message history
  - `loading: boolean` (line 317) - Overall loading state
  - `isStreaming: boolean` (line 376) - SSE streaming state
  
#### Message Interface
- Location: `src/hooks/useOpenCode.ts:100-122`
- Current fields:
  - `id`, `type`, `content`, `timestamp`, `parts`, `metadata`, `optimistic`, `error`, `errorMessage`
- **Missing**: `queued` flag for queue state tracking

#### Send Message Flow
- Location: `src/hooks/useOpenCode.ts:1660-1823`
- Current behavior:
  - Validates session exists
  - Marks session as running
  - Sets `loading` state to true
  - Blocks until response completes
  
#### UI Message Input
- Location: `src/app/index.tsx:400-453`
- Current behavior at line 401: `if (!input.trim() || loading) return;`
- **Problem**: Input is blocked when `loading === true`

#### Streaming State Detection
- Location: `src/hooks/useOpenCode.ts:1009-1015, 1222-1232`
- SSE events set `isStreaming` when parts are received
- `message.updated` event resets `isStreaming` to false
- Timeout mechanism (3 seconds) prevents stuck streaming state

### External References

#### TUI Message Queuing (Reference Implementation)
- **Repository**: https://github.com/opencodelabs/opencode
- **File**: Core TUI message handling logic
- **Behavior to Match**:
  - Queue messages during active agent response
  - Display queued messages with distinct styling
  - Auto-process next queued message when idle
  - Allow queue manipulation (view, cancel)

#### SSE Event Documentation
- **Local**: `CONTEXT/SSE-EVENTS-DOCUMENTATION.md`
- **Relevant Events**:
  - `session.idle` - Fired when agent completes (line 69-77 in useOpenCode.ts)
  - `message.part.updated` - Fired during streaming (line 1211-1342)
  - `message.updated` - Fired on message completion (line 1000-1197)

## Architecture Design

### State Management Changes

#### New State Variables (useOpenCode.ts)

```typescript
// Add after line 376
const [messageQueue, setMessageQueue] = useState<Message[]>([]);
const [isProcessingQueue, setIsProcessingQueue] = useState(false);
```

#### Extended Message Interface (useOpenCode.ts:100)

```typescript
interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  reverted?: boolean;
  parts?: Part[];
  metadata?: {
    tokens?: { input: number; output: number; reasoning: number };
    cost?: number;
    model?: string;
    agent?: string;
  };
  toolData?: {
    command?: string;
    output?: string;
    fileDiffs?: Array<{ path: string; diff: string }>;
    shellLogs?: string[];
  };
  optimistic?: boolean;
  error?: boolean;
  errorMessage?: string;
  queued?: boolean;  // NEW: Indicates message is in queue
  queuePosition?: number;  // NEW: Position in queue (1-based)
}
```

### Queue Management Functions

#### Add to Queue (useOpenCode.ts)

```typescript
const addToQueue = useCallback((message: Message) => {
  setMessageQueue((prev) => {
    const newQueue = [...prev, { ...message, queued: true }];
    // Update queue positions
    return newQueue.map((msg, idx) => ({
      ...msg,
      queuePosition: idx + 1,
    }));
  });
}, []);
```

#### Remove from Queue (useOpenCode.ts)

```typescript
const removeFromQueue = useCallback((messageId: string) => {
  setMessageQueue((prev) => {
    const filtered = prev.filter((msg) => msg.id !== messageId);
    // Re-index queue positions
    return filtered.map((msg, idx) => ({
      ...msg,
      queuePosition: idx + 1,
    }));
  });
}, []);
```

#### Process Next in Queue (useOpenCode.ts)

```typescript
const processNextInQueue = useCallback(async () => {
  if (messageQueue.length === 0 || isProcessingQueue || loading || isStreaming) {
    return;
  }

  const nextMessage = messageQueue[0];
  if (!nextMessage) return;

  setIsProcessingQueue(true);

  try {
    // Remove from queue and add to messages
    setMessageQueue((prev) => prev.slice(1).map((msg, idx) => ({
      ...msg,
      queuePosition: idx + 1,
    })));
    
    // Send the queued message
    await sendMessage(
      nextMessage.content,
      selectedModel?.providerID,
      selectedModel?.modelID,
      currentSession ?? undefined,
      currentAgent ?? undefined,
    );
  } catch (error) {
    console.error("[Queue] Failed to process queued message:", error);
    // Re-add to front of queue on error
    setMessageQueue((prev) => [nextMessage, ...prev]);
  } finally {
    setIsProcessingQueue(false);
  }
}, [
  messageQueue,
  isProcessingQueue,
  loading,
  isStreaming,
  sendMessage,
  selectedModel,
  currentSession,
  currentAgent,
]);
```

### Integration Points

#### 1. Update handleSend (src/app/index.tsx:400)

**Current Code** (line 400-453):
```typescript
const handleSend = async () => {
  if (!input.trim() || loading) return;  // BLOCKS WHEN LOADING
```

**New Code**:
```typescript
const handleSend = async () => {
  if (!input.trim()) return;

  const messageText = input;
  setInput("");

  try {
    // Ensure we have a session
    let session = currentSession;
    if (!session) {
      session = await createSession({ title: "opencode-web session" });
      await loadSessions();
    }

    const parsed = parseCommand(messageText, commands);
    
    // Handle commands immediately (don't queue)
    if (parsed.type === "slash") {
      await handleCommand(messageText);
      return;
    } else if (parsed.type === "shell") {
      await handleShellCommand(parsed.command || "");
      return;
    }

    // Check if agent is currently busy
    const isBusy = loading || isStreaming || currentSessionBusy;
    
    if (isBusy) {
      // ADD TO QUEUE instead of blocking
      const queuedMessage: Message = {
        id: `queued-${Date.now()}`,
        type: "user",
        content: messageText,
        timestamp: new Date(),
        queued: true,
        optimistic: true,
      };
      addToQueue(queuedMessage);
      
      // Show visual feedback
      setMessages((prev) => [...prev, queuedMessage]);
    } else {
      // Process immediately
      const pendingId = `user-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: pendingId,
          type: "user" as const,
          content: messageText,
          timestamp: new Date(),
          optimistic: true,
        },
      ]);

      try {
        await sendMessage(
          messageText,
          selectedModel?.providerID,
          selectedModel?.modelID,
          session,
          currentAgent ?? undefined,
        );
      } catch (error) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.optimistic ? { ...msg, optimistic: false, error: true } : msg,
          ),
        );
        throw error;
      }
    }
    
    await loadSessions();
  } catch (err) {
    console.error("Failed to send message:", err);
  }
};
```

#### 2. Update SSE session.idle Handler (src/hooks/useOpenCode.ts:963-978)

**Current Code** (line 963-978):
```typescript
case "session.idle": {
  const sessionId = event.properties.sessionID;
  if (sessionId) {
    markSessionIdle(sessionId);
    debugLog("[SSE] Session idle:", sessionId);
  }
  if (sessionId && sessionId === activeSession?.id) {
    loadMessages(sessionId).catch((error) => {
      console.error(
        "[SSE] Failed to refresh messages after idle:",
        error,
      );
    });
  }
  break;
}
```

**New Code**:
```typescript
case "session.idle": {
  const sessionId = event.properties.sessionID;
  if (sessionId) {
    markSessionIdle(sessionId);
    debugLog("[SSE] Session idle:", sessionId);
  }
  if (sessionId && sessionId === activeSession?.id) {
    loadMessages(sessionId).catch((error) => {
      console.error(
        "[SSE] Failed to refresh messages after idle:",
        error,
      );
    });
    
    // PROCESS NEXT QUEUED MESSAGE
    if (messageQueue.length > 0) {
      debugLog("[SSE] Processing next queued message after idle");
      processNextInQueue();
    }
  }
  break;
}
```

#### 3. Clear Queue on Session Change (src/hooks/useOpenCode.ts)

Add effect after line 1509:
```typescript
// Clear queue when switching sessions
useEffect(() => {
  if (currentSession?.id) {
    setMessageQueue([]);
    setIsProcessingQueue(false);
  }
}, [currentSession?.id]);
```

#### 4. Update Context Provider (src/contexts/OpenCodeContext.tsx)

Add to interface (line 4):
```typescript
interface OpenCodeContextType {
  // ... existing fields ...
  messageQueue: ReturnType<typeof useOpenCode>["messageQueue"];
  addToQueue: ReturnType<typeof useOpenCode>["addToQueue"];
  removeFromQueue: ReturnType<typeof useOpenCode>["removeFromQueue"];
  processNextInQueue: ReturnType<typeof useOpenCode>["processNextInQueue"];
  isProcessingQueue: ReturnType<typeof useOpenCode>["isProcessingQueue"];
}
```

## User Interface Design

### Visual Indicators for Queued Messages

#### Message Display Component Updates

**File**: `src/app/_components/message/MessagePart.tsx` (or create new component)

```typescript
// Add visual indicator for queued messages
{message.queued && (
  <div className="flex items-center gap-2 text-xs text-theme-muted mb-2">
    <div className="w-2 h-2 rounded-full bg-theme-warning animate-pulse" />
    <span>Queued (Position: {message.queuePosition})</span>
  </div>
)}
```

#### Queue Count Badge

**File**: `src/app/index.tsx` (add near input area, around line 2500)

```typescript
{messageQueue.length > 0 && (
  <div className="flex items-center gap-2 px-3 py-2 bg-theme-background-alt rounded-md">
    <Badge variant="warning" cap="round">
      {messageQueue.length} message{messageQueue.length > 1 ? 's' : ''} queued
    </Badge>
    <Button
      variant="foreground0"
      size="small"
      onClick={() => setMessageQueue([])}
      title="Clear queue"
    >
      Clear Queue
    </Button>
  </div>
)}
```

#### Individual Queue Item Cancel Button

**File**: Message display section in `src/app/index.tsx`

```typescript
{message.queued && (
  <Button
    variant="foreground0"
    size="small"
    onClick={() => removeFromQueue(message.id)}
    className="ml-2"
    title="Cancel queued message"
  >
    ✕ Cancel
  </Button>
)}
```

### Input Field Behavior

**File**: `src/app/index.tsx` (around line 2480-2550)

- Keep input field ENABLED during loading/streaming
- Show queue count badge above input when queue has items
- Display "Sending..." or "Queuing..." feedback based on state
- Add visual indicator that message will be queued (e.g., different button color)

```typescript
<Button
  onClick={handleSend}
  disabled={!input.trim()}
  variant={loading || isStreaming ? "warning" : "primary"}
  className="send-button"
>
  {loading || isStreaming ? "Queue Message" : "Send"}
</Button>
```

## Implementation Tasks

### Phase 1: State Management & Core Logic

- [x] **Task 1.1**: Extend Message interface with `queued` and `queuePosition` fields
  - File: `src/hooks/useOpenCode.ts:100-122`
  - Add optional fields to interface
  - Update TypeScript types throughout codebase
  - **Validation**: TypeScript compiles without errors

- [x] **Task 1.2**: Add queue state variables to useOpenCode hook
  - File: `src/hooks/useOpenCode.ts:313-390`
  - Add `messageQueue` state (array of Message)
  - Add `isProcessingQueue` state (boolean)
  - **Validation**: Hook initializes without errors

- [x] **Task 1.3**: Implement `addToQueue` function
  - File: `src/hooks/useOpenCode.ts` (after line 485)
  - Create function with queue position tracking
  - Add to hook's return object
  - **Validation**: Function adds messages with correct positions

- [x] **Task 1.4**: Implement `removeFromQueue` function
  - File: `src/hooks/useOpenCode.ts` (after addToQueue)
  - Create function with position re-indexing
  - Add to hook's return object
  - **Validation**: Function removes messages and updates positions

- [x] **Task 1.5**: Implement `processNextInQueue` function
  - File: `src/hooks/useOpenCode.ts` (after removeFromQueue)
  - Create async function with error handling
  - Guard against concurrent processing
  - Add to hook's return object
  - **Validation**: Function processes queue items sequentially

### Phase 2: Integration with Message Flow

- [x] **Task 2.1**: Update `handleSend` to check agent busy state
  - File: `src/app/index.tsx:400-453`
  - Replace `loading` check with busy state check
  - Branch to queue or immediate send
  - Import `addToQueue` from context
  - **Validation**: Messages queue when agent is busy

- [x] **Task 2.2**: Update SSE `session.idle` handler
  - File: `src/hooks/useOpenCode.ts:963-978`
  - Add call to `processNextInQueue` after idle
  - Add debug logging
  - **Validation**: Next message processes after agent completes

- [x] **Task 2.3**: Add queue clearing on session change
  - File: `src/hooks/useOpenCode.ts` (after line 1509)
  - Create useEffect with session ID dependency
  - Clear queue and processing state
  - **Validation**: Queue clears when switching sessions

- [x] **Task 2.4**: Update OpenCodeContext interface and provider
  - File: `src/contexts/OpenCodeContext.tsx:4-89`
  - Add queue-related fields to interface
  - Ensure all functions are passed through provider
  - **Validation**: Context provides queue functions to components

### Phase 3: UI Components & Visual Feedback

- [x] **Task 3.1**: Add queued message visual indicator
  - File: `src/app/_components/message/` (component to be determined)
  - Create badge/icon showing "Queued"
  - Display queue position number
  - Style with theme variables
  - **Validation**: Queued messages show distinct visual indicator

- [x] **Task 3.2**: Add queue count badge above input
  - File: `src/app/index.tsx` (before input area ~line 2480)
  - Show count of queued messages
  - Only visible when queue has items
  - Include "Clear Queue" button
  - **Validation**: Badge appears/disappears with queue state

- [x] **Task 3.3**: Add cancel button to queued messages
  - File: `src/app/index.tsx` (in message display section)
  - Show "Cancel" button for queued messages
  - Call `removeFromQueue` on click
  - **Validation**: Cancel removes message from queue

- [x] **Task 3.4**: Update send button to show queue/send state
  - File: `src/app/index.tsx` (input section)
  - Change button text based on busy state
  - Change button color/variant when queuing
  - Keep button enabled during streaming
  - **Validation**: Button indicates whether message will queue

- [x] **Task 3.5**: Keep input field enabled during loading
  - File: `src/app/index.tsx:2480-2550`
  - Remove `disabled={loading}` from textarea
  - Remove `loading` check from `handleSend` guard
  - **Validation**: Input remains enabled while agent responds

### Phase 4: Error Handling & Edge Cases

- [x] **Task 4.1**: Handle queue processing errors
  - File: `src/hooks/useOpenCode.ts` (in processNextInQueue)
  - Catch sendMessage errors
  - Re-add message to front of queue on failure
  - Show error toast to user
  - **Validation**: Failed messages remain in queue

- [x] **Task 4.2**: Handle session deletion with active queue
  - File: `src/hooks/useOpenCode.ts:1956-1978`
  - Clear queue in deleteSession function
  - Add confirmation if queue is non-empty
  - **Validation**: Queue cleared when session deleted

- [x] **Task 4.3**: Handle browser refresh with queued messages
  - File: `src/hooks/useOpenCode.ts` (hydration section)
  - Consider: Should queue persist? (Recommendation: No)
  - Clear queue on hydration
  - **Validation**: Queue starts empty after refresh

- [x] **Task 4.4**: Prevent duplicate processing
  - File: `src/hooks/useOpenCode.ts` (processNextInQueue)
  - Add guard for `isProcessingQueue`
  - Add guard for `loading` and `isStreaming`
  - **Validation**: Only one queue item processes at a time

- [x] **Task 4.5**: Handle rapid message queuing
  - File: `src/app/index.tsx` (handleSend)
  - Test submitting multiple messages quickly
  - Ensure queue maintains order
  - Ensure positions update correctly
  - **Validation**: Queue order matches submission order

### Phase 5: Testing & Validation

- [x] **Task 5.1**: Test basic queue functionality
  - Send message while agent is responding
  - Verify message appears with "Queued" indicator
  - Verify message processes after agent completes
  - **Validation**: Basic queue flow works end-to-end

- [x] **Task 5.2**: Test multiple queued messages
  - Queue 3+ messages while agent is busy
  - Verify all messages process in order
  - Verify queue count decrements correctly
  - **Validation**: Multiple messages process sequentially

- [x] **Task 5.3**: Test queue cancellation
  - Queue multiple messages
  - Cancel individual messages
  - Cancel entire queue with "Clear Queue"
  - Verify cancelled messages don't process
  - **Validation**: Cancellation works correctly

- [x] **Task 5.4**: Test session switching with queue
  - Queue messages in session A
  - Switch to session B
  - Verify queue is cleared
  - Return to session A
  - Verify queue stays cleared
  - **Validation**: Queue clears on session change

- [x] **Task 5.5**: Test error scenarios
  - Queue message
  - Force network error during processing
  - Verify error handling
  - Verify message remains accessible
  - **Validation**: Errors handled gracefully

- [x] **Task 5.6**: Test UI responsiveness
  - Verify input stays enabled during streaming
  - Verify queue badge appears/disappears
  - Verify visual indicators are clear
  - Test on mobile viewport
  - **Validation**: UI updates correctly across devices

### Phase 6: Performance & Polish

- [ ] **Task 6.1**: Add queue size limit (optional)
  - File: `src/hooks/useOpenCode.ts` (addToQueue)
  - Consider max queue size (e.g., 10 messages)
  - Show warning when approaching limit
  - **Validation**: Queue prevents unbounded growth

- [ ] **Task 6.2**: Add queue persistence (optional)
  - File: `src/hooks/useOpenCode.ts`
  - Save queue to localStorage
  - Restore on hydration
  - **Decision**: Evaluate if this adds value or complexity

- [ ] **Task 6.3**: Add keyboard shortcuts for queue
  - File: `src/app/index.tsx`
  - Consider: Ctrl+Q to view queue
  - Consider: Ctrl+Shift+C to clear queue
  - **Validation**: Shortcuts work without conflicts

- [ ] **Task 6.4**: Optimize queue rendering
  - File: Message display components
  - Use React.memo for queued messages
  - Avoid re-renders during position updates
  - **Validation**: No performance degradation with large queues

- [ ] **Task 6.5**: Add accessibility improvements
  - Add ARIA labels for queue status
  - Add screen reader announcements for queue changes
  - Ensure keyboard navigation works
  - **Validation**: Meets WCAG 2.1 AA standards

## Data Models

### Message Queue State

```typescript
// In useOpenCode hook
const [messageQueue, setMessageQueue] = useState<Message[]>([]);
const [isProcessingQueue, setIsProcessingQueue] = useState<boolean>(false);
```

### Extended Message Type

```typescript
interface Message {
  // Existing fields...
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  
  // New fields for queuing
  queued?: boolean;        // True if message is in queue
  queuePosition?: number;  // 1-based position in queue
  
  // Existing optional fields...
  reverted?: boolean;
  parts?: Part[];
  metadata?: {...};
  optimistic?: boolean;
  error?: boolean;
  errorMessage?: string;
}
```

## Configuration

No configuration changes required. Queue behavior is always enabled.

### Optional Future Configuration

Consider adding to `OpencodeConfig`:

```typescript
interface OpencodeConfig {
  // ... existing fields ...
  queue?: {
    maxSize?: number;        // Max queued messages (default: unlimited)
    persistQueue?: boolean;  // Save queue to localStorage (default: false)
    autoProcess?: boolean;   // Auto-process on idle (default: true)
  };
}
```

## API Endpoints

No new API endpoints required. Uses existing:

- `POST /sessions/{id}/messages` - Send message (via `openCodeService.sendMessage`)
- SSE `/events` - Listen for `session.idle` events

## Validation Criteria

### Functional Requirements

1. ✅ **Queue Creation**: Users can send messages while agent is responding
2. ✅ **Visual Feedback**: Queued messages display with "Queued" badge and position
3. ✅ **Sequential Processing**: Messages process in FIFO order after agent completes
4. ✅ **Cancellation**: Users can cancel individual or all queued messages
5. ✅ **Queue Count**: Display shows number of queued messages
6. ✅ **Input Enabled**: Input field remains enabled during agent response
7. ✅ **Session Isolation**: Queue clears when switching sessions

### Non-Functional Requirements

1. ✅ **Performance**: No visible lag when queuing up to 10 messages
2. ✅ **Reliability**: Queue state survives component re-renders
3. ✅ **Error Handling**: Failed messages don't break queue processing
4. ✅ **Accessibility**: Queue status announced to screen readers
5. ✅ **Mobile Support**: Queue UI works on mobile viewports (≥320px)

### Acceptance Tests

#### Test Case 1: Basic Queuing
```
1. Start new session
2. Send message "Task 1"
3. While agent is typing, send "Task 2"
4. Verify "Task 2" shows "Queued (Position: 1)"
5. Wait for "Task 1" response to complete
6. Verify "Task 2" automatically starts processing
7. Verify "Task 2" completes successfully
```

#### Test Case 2: Multiple Queued Messages
```
1. Start new session  
2. Send message "Task 1"
3. While agent is typing, send "Task 2", "Task 3", "Task 4"
4. Verify all show queued with positions 1, 2, 3
5. Verify queue count shows "3 messages queued"
6. Wait for all to process
7. Verify all 4 messages completed in order
```

#### Test Case 3: Cancel Queue
```
1. Start new session
2. Send message "Task 1"
3. Queue "Task 2", "Task 3"
4. Click "Cancel" on "Task 3"
5. Verify "Task 3" removed, "Task 2" position updates to 1
6. Click "Clear Queue"
7. Verify "Task 2" removed
8. Verify only "Task 1" processes
```

#### Test Case 4: Session Switch
```
1. In session A, send "Task 1"
2. Queue "Task 2", "Task 3"
3. Switch to session B
4. Verify queue cleared (no queued messages in A)
5. Switch back to session A
6. Verify queue still cleared
7. Verify only "Task 1" in history
```

#### Test Case 5: Error Recovery
```
1. Mock network failure in sendMessage
2. Send message "Task 1"
3. Queue "Task 2"
4. Wait for "Task 1" to complete
5. Verify "Task 2" processing fails
6. Verify error message shown
7. Verify "Task 2" remains accessible for retry
```

## Migration Path

No migration required. This is a new feature with:
- No breaking changes to existing functionality
- No database schema changes
- No API contract changes
- Backward compatible message structure

## Rollback Plan

If issues occur:

1. **Immediate Rollback**: Revert PR containing queue changes
2. **State Cleanup**: Clear localStorage keys (none added for queue)
3. **User Impact**: Users return to previous behavior (blocked input during loading)
4. **Data Loss**: In-flight queued messages lost (acceptable - not persisted)

## Dependencies

### Internal Dependencies
- `src/hooks/useOpenCode.ts` - Core hook modification
- `src/app/index.tsx` - UI integration
- `src/contexts/OpenCodeContext.tsx` - Context updates
- `src/app/_components/message/*` - Message display components

### External Dependencies
None. Uses existing React state management patterns.

### Version Requirements
- React 18+ (already in use)
- TypeScript 5+ (already in use)
- No new npm packages required

## Performance Considerations

### State Updates
- Queue operations are O(n) where n = queue length
- Recommend max queue size of 50 to prevent performance issues
- Use React.memo for queue item components to prevent re-renders

### Memory Impact
- Each queued message: ~2KB (content + metadata)
- 10 queued messages: ~20KB
- Negligible impact on browser memory

### Network Impact
- No change to network behavior
- Messages still sent one at a time sequentially
- No additional API calls

## Security Considerations

### Input Validation
- Queued messages use same validation as immediate messages
- Content sanitization handled by existing `sendMessage` function
- No new XSS vectors introduced

### Session Isolation
- Queue is session-scoped (cleared on switch)
- No cross-session message leakage
- Queue not persisted to localStorage (no data exposure)

### Authorization
- Queue operations inherit session permissions
- No new permission model needed

## Accessibility

### Screen Reader Support
- Announce queue count changes: "2 messages queued"
- Announce queue processing: "Processing message 1 of 3"
- Announce cancellation: "Message removed from queue"

### Keyboard Navigation
- Tab to cancel buttons on queued messages
- Enter to activate cancel
- Escape to clear entire queue (optional)

### Visual Indicators
- High contrast "Queued" badge
- Clear queue position numbers
- Animated pulse on queue badge (respects prefers-reduced-motion)

## Documentation Updates

### User Documentation
- [ ] Add "Message Queuing" section to README
- [ ] Update screenshots to show queue UI
- [ ] Add FAQ entry about queue behavior

### Developer Documentation  
- [ ] Add JSDoc comments to queue functions
- [ ] Update architecture diagram with queue flow
- [ ] Document queue state management pattern

### API Documentation
- [ ] Update OpenCodeContext TypeScript interface docs
- [ ] Document queue-related hook exports
- [ ] Add examples to useOpenCode hook documentation

## Timeline Estimate

### Development
- Phase 1 (State Management): 4 hours
- Phase 2 (Integration): 4 hours
- Phase 3 (UI Components): 6 hours
- Phase 4 (Error Handling): 3 hours
- Phase 5 (Testing): 5 hours
- Phase 6 (Polish): 3 hours

**Total Development**: ~25 hours (3-4 days)

### Testing & Review
- Unit testing: 4 hours
- Integration testing: 4 hours
- Code review: 2 hours
- QA testing: 3 hours

**Total Testing**: ~13 hours (1.5-2 days)

### Total Timeline
**5-6 working days** for complete implementation and testing

## Success Metrics

### Quantitative
- ✅ 0 regressions in existing message sending
- ✅ Queue processes 100% of messages in correct order
- ✅ <100ms overhead for queue operations
- ✅ 100% test coverage for queue functions

### Qualitative  
- ✅ Users report improved productivity
- ✅ UI feels responsive during agent responses
- ✅ Queue behavior matches TUI experience
- ✅ No confusion about queue state

## Future Enhancements

### Queue Management UI
- Dedicated queue panel/drawer
- Drag-and-drop to reorder queue
- Edit queued message content before processing

### Advanced Features
- Queue message to specific agent
- Queue message with different model
- Schedule queue processing (time-based)
- Queue templates/macros

### Analytics
- Track average queue size
- Track queue wait times  
- Track cancellation rates
- A/B test queue UI variations

## References

### Code Files
- `src/hooks/useOpenCode.ts` - Main hook implementation
- `src/app/index.tsx` - Chat UI component  
- `src/contexts/OpenCodeContext.tsx` - React context provider
- `src/lib/opencode-events.ts` - SSE event types

### Documentation
- `CONTEXT/SSE-EVENTS-DOCUMENTATION.md` - SSE event specifications
- `CONTEXT/API-ENDPOINTS-DOCUMENTATION.md` - API endpoint docs
- Issue #25: https://github.com/kcrommett/opencode-web/issues/25

### External Resources
- OpenCode TUI: https://github.com/opencodelabs/opencode
- React State Management: https://react.dev/learn/managing-state
- EventSource API: https://developer.mozilla.org/en-US/docs/Web/API/EventSource

---

## Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2025-01-26 | AI Assistant | Initial plan creation |

## Approval Sign-Off

- [ ] Technical Lead Review
- [ ] Product Owner Approval  
- [ ] Security Review (if needed)
- [ ] Accessibility Review

---

**Next Steps**: Begin Phase 1 implementation after approval
