# OpenCode API Endpoints Documentation

This document provides a comprehensive overview of all available API endpoints in the OpenCode system, based on the OpenAPI 3.1.1 specification.

## Base Information

- **API Version**: 0.0.3
- **Title**: opencode api
- **Base URL**: http://10.0.2.100:3333 (default: http://127.0.0.1:4096)

### Windows Configuration Note

When using opencode-web on Windows with `bunx`, you must configure an external OpenCode Server:

**Default host/port when using `--external-server`:**
- **Host**: `127.0.0.1` (preferred over `localhost` on Windows)
- **Port**: `4096` (default OpenCode Server port)
- **Full URL**: `http://127.0.0.1:4096`

**Example:**
```powershell
# Start OpenCode Server
opencode serve --hostname=127.0.0.1 --port=4096

# Connect opencode-web
bunx opencode-web@latest --external-server http://127.0.0.1:4096
```

For more details on Windows + bunx limitations, see [Windows + bunx Limitation](../README.md#windows--bunx-limitation).

## Common Query Parameters

Most endpoints accept the following optional query parameter:
- `directory` (string): Specifies the working directory for the operation

---

## Project Management

### List Projects
**GET** `/project`

Lists all available projects.

**Response**: Array of Project objects
```json
{
  "id": "string",
  "worktree": "string", 
  "vcs": "git",
  "time": {
    "created": "number",
    "initialized": "number"
  }
}
```

### Get Current Project
**GET** `/project/current`

Retrieves information about the current active project.

**Response**: Project object

---

## Configuration Management

### Get Configuration
**GET** `/config`

Retrieves current configuration settings.

**Response**: Config object with extensive configuration options including:
- Theme settings
- Keybinds configuration
- Agent configurations
- Provider settings
- MCP server configurations
- LSP configurations
- And more

### Update Configuration
**PATCH** `/config`

Updates configuration settings.

**Request Body**: Config object
**Response**: Updated Config object

### List Providers
**GET** `/config/providers`

Lists all available providers and their models.

**Response**: 
```json
{
  "providers": [Provider objects],
  "default": {"provider": "model"}
}
```

---

## Session Management

### List Sessions
**GET** `/session`

Lists all sessions.

**Response**: Array of Session objects

### Create Session
**POST** `/session`

Creates a new session.

**Request Body**:
```json
{
  "parentID": "ses.*",
  "title": "string"
}
```

**Response**: Session object

### Get Session
**GET** `/session/{id}`

Retrieves a specific session by ID.

**Path Parameters**:
- `id` (string, pattern: `^ses.*`): Session ID

**Response**: Session object

### Update Session
**PATCH** `/session/{id}`

Updates session properties.

**Path Parameters**:
- `id` (string): Session ID

**Request Body**:
```json
{
  "title": "string"
}
```

### Delete Session
**DELETE** `/session/{id}`

Deletes a session and all its data.

**Path Parameters**:
- `id` (string, pattern: `^ses.*`): Session ID

**Response**: boolean

### Get Session Children
**GET** `/session/{id}/children`

Retrieves child sessions of a given session.

**Path Parameters**:
- `id` (string, pattern: `^ses.*`): Session ID

**Response**: Array of Session objects

### Get Session Todo List
**GET** `/session/{id}/todo`

Retrieves the todo list for a session.

**Path Parameters**:
- `id` (string): Session ID

**Response**: Array of Todo objects

### Initialize Session
**POST** `/session/{id}/init`

Analyzes the app and creates an AGENTS.md file.

**Path Parameters**:
- `id` (string): Session ID

**Request Body**:
```json
{
  "modelID": "string",
  "providerID": "string", 
  "messageID": "msg.*"
}
```

### Fork Session
**POST** `/session/{id}/fork`

Forks an existing session at a specific message.

**Path Parameters**:
- `id` (string, pattern: `^ses.*`): Session ID

**Request Body**:
```json
{
  "messageID": "msg.*"
}
```

### Abort Session
**POST** `/session/{id}/abort`

Aborts a running session.

**Path Parameters**:
- `id` (string): Session ID

**Response**: boolean

### Share Session
**POST** `/session/{id}/share`

Shares a session.

**Path Parameters**:
- `id` (string): Session ID

**Response**: Session object

### Unshare Session
**DELETE** `/session/{id}/share`

Unshares a session.

**Path Parameters**:
- `id` (string, pattern: `^ses.*`): Session ID

**Response**: Session object

### Get Session Diff
**GET** `/session/{id}/diff`

Gets the diff that resulted from a user message.

**Path Parameters**:
- `id` (string, pattern: `^ses.*`): Session ID
- `messageID` (string, pattern: `^msg.*`): Message ID

**Response**: Array of FileDiff objects

### Summarize Session
**POST** `/session/{id}/summarize`

Summarizes the session.

**Path Parameters**:
- `id` (string): Session ID

**Request Body**:
```json
{
  "providerID": "string",
  "modelID": "string"
}
```

**Response**: boolean

---

## Message Management

### List Messages
**GET** `/session/{id}/message`

Lists all messages for a session.

**Path Parameters**:
- `id` (string): Session ID

**Response**: Array of message objects with info and parts

### Create Message
**POST** `/session/{id}/message`

Creates and sends a new message to a session.

**Path Parameters**:
- `id` (string): Session ID

**Request Body**:
```json
{
  "messageID": "msg.*",
  "model": {
    "providerID": "string",
    "modelID": "string"
  },
  "agent": "string",
  "system": "string",
  "tools": {"toolName": true},
  "acpConnection": {
    "connection": {},
    "sessionId": "string"
  },
  "parts": [TextPartInput | FilePartInput | AgentPartInput]
}
```

### Get Message
**GET** `/session/{id}/message/{messageID}`

Retrieves a specific message from a session.

**Path Parameters**:
- `id` (string): Session ID
- `messageID` (string): Message ID

**Response**: Message object

---

## Session Operations

### Send Command
**POST** `/session/{id}/command`

Sends a new command to a session.

**Path Parameters**:
- `id` (string): Session ID

**Request Body**:
```json
{
  "messageID": "msg.*",
  "agent": "string",
  "model": "string",
  "arguments": "string",
  "command": "string"
}
```

### Run Shell Command
**POST** `/session/{id}/shell`

Runs a shell command within a session.

**Path Parameters**:
- `id` (string): Session ID

**Request Body**:
```json
{
  "agent": "string",
  "command": "string",
  "args": ["string"],
  "directory": "string",
  "multiline": "boolean"
}
```

**Enhanced Response** (for shell command enhancements):
```json
{
  "info": {
    "id": "string",
    "exitCode": "number",
    "duration": "number",
    "workingDirectory": "string",
    "command": "string"
  },
  "parts": [
    {
      "type": "tool",
      "tool": "shell",
      "status": "completed|error|running",
      "input": "string",
      "output": "string",
      "error": {
        "message": "string",
        "stack": "string"
      },
      "state": {
        "timings": {
          "duration": "number"
        }
      }
    }
  ]
}
```

**Shell Command Enhancements**:
- Multi-line command support with preserved formatting
- ANSI color code rendering in output
- Command history with metadata (exit codes, timestamps)
- Real-time status indicators (running, completed, error)
- Enhanced error handling with stderr separation
- Keyboard shortcuts for multi-line editing (Shift+Enter)

### Revert Message
**POST** `/session/{id}/revert`

Reverts a message in a session.

**Path Parameters**:
- `id` (string): Session ID

**Request Body**:
```json
{
  "messageID": "msg.*",
  "partID": "prt.*"
}
```

### Restore Reverted Messages
**POST** `/session/{id}/unrevert`

Restores all reverted messages in a session.

**Path Parameters**:
- `id` (string): Session ID

### Handle Permissions
**POST** `/session/{id}/permissions/{permissionID}`

Responds to a permission request.

**Path Parameters**:
- `id` (string): Session ID
- `permissionID` (string): Permission ID

**Request Body**:
```json
{
  "response": "once" | "always" | "reject"
}
```

---

## Command Management

### List Commands
**GET** `/command`

Lists all available commands.

**Response**: Array of Command objects

---

## File Operations

### Find Text
**GET** `/find`

Finds text in files.

**Query Parameters**:
- `pattern` (string, required): Search pattern

**Response**: Array of match objects with file paths, line numbers, and submatches

### Find Files
**GET** `/find/file`

Finds files matching a query.

**Query Parameters**:
- `query` (string, required): Search query

**Response**: Array of file paths

### Find Symbols
**GET** `/find/symbol`

Finds workspace symbols.

**Query Parameters**:
- `query` (string, required): Symbol query

**Response**: Array of Symbol objects

### List Files
**GET** `/file`

Lists files and directories.

**Query Parameters**:
- `path` (string, required): Directory path

**Response**: Array of FileNode objects

### Read File
**GET** `/file/content`

Reads file content.

**Query Parameters**:
- `path` (string, required): File path

**Response**: FileContent object

### Get File Status
**GET** `/file/status`

Gets file status (git status).

**Response**: Array of File objects with status information

---

## Experimental Features

### List Tool IDs
**GET** `/experimental/tool/ids`

Lists all tool IDs including built-in and dynamically registered tools.

**Response**: Array of tool IDs

### List Tools
**GET** `/experimental/tool`

Lists tools with JSON schema parameters for a provider/model.

**Query Parameters**:
- `provider` (string, required): Provider ID
- `model` (string, required): Model ID

**Response**: Array of ToolListItem objects

---

## Path Management

### Get Current Path
**GET** `/path`

Gets the current working path information.

**Response**: Path object with state, config, worktree, and directory

---

## Application Management

### Write Log Entry
**POST** `/log`

Writes a log entry to the server logs.

**Request Body**:
```json
{
  "service": "string",
  "level": "debug" | "info" | "error" | "warn",
  "message": "string",
  "extra": {}
}
```

### List Agents
**GET** `/agent`

Lists all available agents.

**Response**: Array of Agent objects

### Get MCP Status
**GET** `/mcp`

Gets MCP (Model Context Protocol) server status.

**Response**: MCP server status object

---

## TUI (Terminal User Interface) Controls

### Append Prompt
**POST** `/tui/append-prompt`

Appends text to the TUI prompt.

**Request Body**:
```json
{
  "text": "string"
}
```

### Open Help Dialog
**POST** `/tui/open-help`

Opens the help dialog in the TUI.

### Open Sessions Dialog
**POST** `/tui/open-sessions`

Opens the session dialog in the TUI.

### Open Themes Dialog
**POST** `/tui/open-themes`

Opens the theme dialog in the TUI.

### Open Models Dialog
**POST** `/tui/open-models`

Opens the model dialog in the TUI.

### Submit Prompt
**POST** `/tui/submit-prompt`

Submits the current prompt in the TUI.

### Clear Prompt
**POST** `/tui/clear-prompt`

Clears the prompt in the TUI.

### Execute TUI Command
**POST** `/tui/execute-command`

Executes a TUI command (e.g., agent_cycle).

**Request Body**:
```json
{
  "command": "string"
}
```

### Show Toast Notification
**POST** `/tui/show-toast`

Shows a toast notification in the TUI.

**Request Body**:
```json
{
  "title": "string",
  "message": "string",
  "variant": "info" | "success" | "warning" | "error"
}
```

---

## Authentication

### Set Authentication
**PUT** `/auth/{id}`

Sets authentication credentials for a provider.

**Path Parameters**:
- `id` (string): Provider ID

**Request Body**: Auth object (OAuth, ApiAuth, or WellKnownAuth)

**Response**: boolean

---

## Event Streaming

### Subscribe to Events
**GET** `/event`

Subscribes to server-sent events for real-time updates.

**Response**: Server-sent event stream with various event types:
- installation.updated
- lsp.client.diagnostics
- message.updated
- message.removed
- message.part.updated
- message.part.removed
- session.compacted
- permission.updated
- permission.replied
- file.edited
- file.watcher.updated
- todo.updated
- session.idle
- session.updated
- session.deleted
- session.error
- server.connected
- ide.installed

---

## Error Responses

The API returns standardized error responses:

### Bad Request (400)
```json
{
  "success": false,
  "data": {},
  "errors": [{}]
}
```

### Not Found (404)
```json
{
  "name": "NotFoundError",
  "data": {
    "message": "string"
  }
}
```

### Provider Authentication Error
```json
{
  "name": "ProviderAuthError",
  "data": {
    "providerID": "string",
    "message": "string"
  }
}
```

### API Error
```json
{
  "name": "APIError",
  "data": {
    "message": "string",
    "statusCode": "number",
    "isRetryable": "boolean",
    "responseHeaders": {},
    "responseBody": "string"
  }
}
```

---

## Data Models

### Session
- `id`: Session ID (pattern: `^ses.*`)
- `projectID`: Project ID
- `directory`: Working directory
- `parentID`: Parent session ID
- `title`: Session title
- `version`: Session version
- `time`: Creation and update timestamps
- `summary`: Session summary with diffs
- `share`: Sharing information
- `revert`: Revert state information

### Message
- `id`: Message ID
- `sessionID`: Session ID
- `role`: "user" or "assistant"
- `time`: Timestamps
- `parts`: Array of message parts (text, file, tool, etc.)

### Message Parts
- **TextPart**: Text content
- **FilePart**: File attachments
- **ToolPart**: Tool execution results
- **ReasoningPart**: AI reasoning content
- **StepPart**: Step markers
- **SnapshotPart**: State snapshots
- **PatchPart**: Code patches
- **AgentPart**: Agent information
- **RetryPart**: Retry information

### Config
Extensive configuration object including:
- Theme settings
- Keybinds
- Agent configurations
- Provider settings
- MCP configurations
- LSP settings
- Permissions
- Tools
- Experimental features

---

## Usage Notes

1. **Authentication**: Most endpoints require proper authentication setup via the `/auth/{id}` endpoint
2. **Directory Context**: Most operations accept a `directory` parameter to specify the working context
3. **Event Streaming**: Use the `/event` endpoint for real-time updates on sessions, messages, and file changes
4. **Session Management**: Sessions support branching, forking, and reverting for flexible workflow management
5. **Tool Integration**: The API supports dynamic tool registration and execution through the experimental endpoints
6. **File Operations**: Comprehensive file system operations including search, read, and status tracking
7. **TUI Control**: Terminal interface can be controlled programmatically via TUI endpoints

This API provides a complete interface for building OpenCode clients and integrations, supporting everything from basic session management to advanced tool execution and real-time event handling.