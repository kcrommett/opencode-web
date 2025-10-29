# OpenCode TUI SSE Event System Documentation

## Overview

The OpenCode TUI (Terminal User Interface) receives real-time updates from the OpenCode server through Server-Sent Events (SSE) via the `/event` endpoint. This document provides a comprehensive analysis of how SSE events are handled, processed, and displayed in the TUI.

## SSE Stream Architecture

### Server-Side Implementation

The SSE stream is implemented in the OpenCode server at `packages/opencode/src/server/server.ts`:

```typescript
.get("/event", async (c) => {
  return streamSSE(c, async (stream) => {
    // Send initial connection event
    stream.writeSSE({
      data: JSON.stringify({
        type: "server.connected",
        properties: {},
      }),
    })

    // Subscribe to all events and stream them
    const unsub = Bus.subscribeAll(async (event) => {
      await stream.writeSSE({
        data: JSON.stringify(event),
      })
    })

    // Cleanup on disconnect
    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        unsub()
        resolve()
      })
    })
  })
})
```

### Client-Side Implementation

The TUI connects to the SSE stream in `packages/tui/cmd/opencode/main.go`:

```go
go func() {
  stream := httpClient.Event.ListStreaming(ctx, opencode.EventListParams{})
  for stream.Next() {
    evt := stream.Current().AsUnion()
    program.Send(evt)
  }
  if err := stream.Err(); err != nil {
    slog.Error("Error streaming events", "error", err)
    program.Send(err)
  }
}()
```

## Event Types and Handling

The TUI processes 18 different SSE event types, each with specific handling logic:

### 1. `server.connected`

- **Type**: `EventListResponseEventServerConnected`
- **Purpose**: Indicates successful SSE connection establishment
- **Properties**: Empty object `{}`
- **TUI Handling**: No specific UI updates, used for connection confirmation

### 2. `installation.updated`

- **Type**: `EventListResponseEventInstallationUpdated`
- **Purpose**: Notifies when OpenCode is updated
- **Properties**: `{ version: string }`
- **TUI Handling**: Shows success toast: "opencode updated to {version}, restart to apply"

### 3. `ide.installed`

- **Type**: `EventListResponseEventIdeInstalled`
- **Purpose**: Notifies when IDE extension is installed
- **Properties**: `{ ide: string }`
- **TUI Handling**: Currently commented out, would show success toast

### 4. `session.updated`

- **Type**: `EventListResponseEventSessionUpdated`
- **Purpose**: Updates session information
- **Properties**: `{ info: Session }`
- **TUI Handling**: Updates the current session if IDs match

### 5. `session.deleted`

- **Type**: `EventListResponseEventSessionDeleted`
- **Purpose**: Notifies when a session is deleted
- **Properties**: `{ info: Session }`
- **TUI Handling**: Clears current session and messages if deleted session matches current session

### 6. `session.compacted`

- **Type**: `EventListResponseEventSessionCompacted`
- **Purpose**: Notifies when a session is compacted
- **Properties**: `{ sessionID: string }`
- **TUI Handling**: Shows success toast if compaction affects current session

### 7. `session.idle`

- **Type**: `EventListResponseEventSessionIdle`
- **Purpose**: Indicates session has become idle
- **Properties**: `{ sessionID: string }`
- **TUI Handling**: No specific UI updates currently

### 8. `session.error`

- **Type**: `EventListResponseEventSessionError`
- **Purpose**: Reports session errors
- **Properties**: `{ error: ErrorUnion, sessionID?: string }`
- **TUI Handling**: Shows error toast based on error type:
  - `ProviderAuthError`: "Provider error: {message}"
  - `UnknownError`: "{message}" with error name as title
  - `MessageOutputLengthError`: No specific handling
  - `MessageAbortedError`: No specific handling

### 9. `message.updated`

- **Type**: `EventListResponseEventMessageUpdated`
- **Purpose**: Updates or adds a complete message
- **Properties**: `{ info: MessageUnion }`
- **TUI Handling**: Complex logic for updating existing messages or inserting new ones:
  - Updates existing message if ID matches
  - Inserts new message in correct chronological order if not found
  - Maintains message order by ID comparison

### 10. `message.removed`

- **Type**: `EventListResponseEventMessageRemoved`
- **Purpose**: Removes a message from the session
- **Properties**: `{ messageID: string, sessionID: string }`
- **TUI Handling**: Removes message from current session if IDs match

### 11. `message.part.updated`

- **Type**: `EventListResponseEventMessagePartUpdated`
- **Purpose**: Updates or adds a part of a message (streaming content)
- **Properties**: `{ part: PartUnion }`
- **TUI Handling**: Complex part management:
  - Updates existing part if ID matches
  - Adds new part if not found
  - Handles different part types: TextPart, ReasoningPart, FilePart, ToolPart, StepStartPart, StepFinishPart

### 12. `message.part.removed`

- **Type**: `EventListResponseEventMessagePartRemoved`
- **Purpose**: Removes a part from a message
- **Properties**: `{ messageID: string, partID: string, sessionID: string }`
- **TUI Handling**: Removes specific part from message if IDs match

### 13. `permission.updated`

- **Type**: `EventListResponseEventPermissionUpdated`
- **Purpose**: Adds a new permission request
- **Properties**: `{ id: string, sessionID: string, ... }`
- **TUI Handling**: Adds permission to list, sets as current permission, blurs editor

### 14. `permission.replied`

- **Type**: `EventListResponseEventPermissionReplied`
- **Purpose**: Handles permission response
- **Properties**: `{ permissionID: string, response: string, sessionID: string }`
- **TUI Handling**: Removes permission from list, updates current permission if needed

### 15. `file.edited`

- **Type**: `EventListResponseEventFileEdited`
- **Purpose**: Notifies when a file is edited
- **Properties**: `{ file: string }`
- **TUI Handling**: No specific UI updates currently

### 16. `file.watcher.updated`

- **Type**: `EventListResponseEventFileWatcherUpdated`
- **Purpose**: Notifies file system changes
- **Properties**: `{ file: string, event: "add" | "change" | "unlink" }`
- **TUI Handling**: No specific UI updates currently

### 17. `todo.updated`

- **Type**: `EventListResponseEventTodoUpdated`
- **Purpose**: Updates todo items for a session
- **Properties**: `{ sessionID: string, todos: TodoItem[] }`
- **TUI Handling**: No specific UI updates currently

### 18. `lsp.client.diagnostics`

- **Type**: `EventListResponseEventLspClientDiagnostics`
- **Purpose**: LSP diagnostics updates
- **Properties**: `{ path: string, serverID: string }`
- **TUI Handling**: No specific UI updates currently

## Event Processing Flow

1. **Connection**: TUI connects to `/event` endpoint
2. **Initial Event**: Server sends `server.connected` event
3. **Event Streaming**: Server streams all bus events as SSE messages
4. **Event Reception**: TUI receives events in background goroutine
5. **Event Dispatch**: Events sent to TUI program via `program.Send()`
6. **Event Handling**: TUI processes events in `Update()` method based on type
7. **UI Updates**: Events trigger appropriate UI changes (toasts, message updates, etc.)

## Message and Part Management

### Message Structure

Messages in the TUI are stored as:

```go
type Message struct {
  Info  opencode.MessageUnion // UserMessage or AssistantMessage
  Parts []opencode.PartUnion  // TextPart, ReasoningPart, etc.
}
```

### Part Types

- **TextPart**: Regular text content
- **ReasoningPart**: AI reasoning/thinking content
- **FilePart**: File operations (create, edit, etc.)
- **ToolPart**: Tool/function call results
- **StepStartPart**: Beginning of multi-step operations
- **StepFinishPart**: End of multi-step operations

### Update Logic

The TUI handles message and part updates with sophisticated logic:

1. **Message Updates**: Maintains chronological order by ID comparison
2. **Part Updates**: Updates existing parts or appends new ones
3. **Part Removal**: Removes specific parts while preserving others
4. **Session Context**: Only processes events for the current session

## Error Handling

The TUI handles various error scenarios:

- **Stream Errors**: Logged and sent to program for display
- **Session Errors**: Displayed as error toasts with appropriate titles
- **Provider Errors**: Displayed with specific error messages
- **Connection Issues**: Graceful handling of disconnections

## Filtering and Display Logic

### Session-Specific Filtering

Most events are filtered by `sessionID` to only affect the current session:

- Message updates only apply to current session
- Permission updates only affect current session
- Session-specific events (deleted, compacted, idle) only affect matching sessions

### UI Display Decisions

- **Toast Notifications**: Used for one-time events (installation updates, errors, session operations)
- **Silent Updates**: Message and part updates happen silently in the background
- **Modal Interactions**: Permission requests trigger modal dialogs
- **Status Updates**: Session changes may update status indicators

## Reproducing in Custom Web Client

To reproduce this SSE handling in a custom web client:

1. **Connect to SSE Endpoint**: Use `EventSource` or fetch API to connect to `/event`
2. **Parse Event Stream**: Handle SSE format with `event:` and `data:` fields
3. **Event Type Detection**: Parse JSON and determine event type from `type` field
4. **State Management**: Implement similar message/part storage and update logic
5. **UI Updates**: Map TUI event handlers to web UI updates (DOM manipulation, state updates)
6. **Error Handling**: Implement appropriate error display and recovery mechanisms

## Key Implementation Details

### Event Union Types

The SDK uses union types to represent different event structures:

```go
type EventListResponse struct {
  Properties interface{}           `json:"properties,required"`
  Type       EventListResponseType `json:"type,required"`
  union      EventListResponseUnion
}
```

### Message Ordering

Messages are ordered by ID comparison, with newer messages having higher IDs:

```go
if existingID < newMessageID {
  insertIndex = i + 1
}
```

### Part Management

Parts within messages are managed as slices with index-based updates and insertions.

This comprehensive event system enables real-time collaboration, live updates, and responsive user experience in the OpenCode TUI.
