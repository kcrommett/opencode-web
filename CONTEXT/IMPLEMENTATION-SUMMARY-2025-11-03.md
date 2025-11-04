# Shell Command Enhancements - Implementation Summary

## Current State Analysis (as of 2025-11-03)

### TUI vs Web Interface Comparison

#### TUI Shell Command Features
Based on the codebase analysis, the TUI implementation (referenced but not directly accessible) appears to have:
- Multi-line command support with proper parsing
- Command history with navigation
- ANSI color/formatting support
- Real-time status indicators
- Better error handling and display

#### Current Web Interface Limitations

1. **Command Parsing (`src/lib/commandParser.ts`)**
   - Only supports single-line shell commands
   - No multi-line detection or handling
   - Simple `!` prefix detection without advanced parsing
   - No support for here-doc syntax or line continuations

2. **Input Handling (`src/app/index.tsx`)**
   - Textarea doesn't support multi-line mode
   - No `Shift+Enter` handling for newlines
   - Commands are trimmed, losing intentional whitespace
   - No visual indicators for shell mode

3. **Output Rendering (`src/app/_components/message/ToolPart.tsx`)**
   - Plain text output without ANSI color support
   - No syntax highlighting for shell output
   - No streaming or progress indicators
   - Basic error display without structured formatting

4. **Command History**
   - No shell-specific history storage
   - No history navigation or search
   - No persistence across sessions

5. **Visual Indicators**
   - No running/progress indicators for shell commands
   - No success/failure badges
   - No command duration display

6. **Keyboard Shortcuts**
   - No shell-specific shortcuts
   - No multi-line toggle
   - No history search functionality

### API Contract Analysis

#### Current Shell Execution Flow
```
User Input → parseCommand() → handleShellCommand() → runShell() → HTTP API → Backend
```

#### Current API Structure (`src/lib/opencode-http-api.ts:355-379`)
- Endpoint: `POST /session/{sessionId}/shell`
- Request: `{ command, args?, directory? }`
- Response: `{ info, parts }`

#### Required API Enhancements
1. **Request Payload Extensions**
   - Add `multiline: boolean` flag
   - Add `rawInput: string` for preserving original text
   - Add `segments: string[]` for multi-line parsing

2. **Response Metadata Extensions**
   - Add `exitCode: number`
   - Add `duration: number` (milliseconds)
   - Add `stdout: string[]` and `stderr: string[]`
   - Add `ansiMarkers: AnsiMarker[]` for formatting

### Data Model Extensions Needed

#### ParsedCommand Interface (`src/lib/commandParser.ts`)
```typescript
interface ParsedCommand {
  type: "slash" | "shell" | "file" | "plain";
  command?: string;
  args?: string[];
  filePath?: string;
  content?: string;
  matchedCommand?: Command;
  // NEW FIELDS
  multiline?: boolean;
  rawInput?: string;
  segments?: string[];
}
```

#### ShellHistoryEntry Interface (new)
```typescript
interface ShellHistoryEntry {
  command: string;
  timestamp: number;
  exitCode?: number;
  duration?: number;
  workingDirectory?: string;
}
```

#### Message Part Extensions
```typescript
interface Part {
  // existing fields...
  toolData?: {
    // existing fields...
    shellLogs?: {
      stdout: string[];
      stderr: string[];
      exitCode: number;
      duration: number;
      workingDirectory: string;
    };
  };
}
```

### Implementation Dependencies

#### External Libraries Required
1. **ANSI Processing**
   - `strip-ansi` - for removing ANSI codes
   - `ansi-to-html` or custom parser - for converting ANSI to HTML

2. **Multi-line Text Handling**
   - Auto-resizing textarea component
   - Better cursor/selection management

#### Configuration Extensions
```typescript
interface ShellConfig {
  historyLimit: number; // default: 50
  multiLineShortcut: string; // default: "Shift+Enter"
  outputTheme: "auto" | "plain" | "themed"; // default: "auto"
  showStatusBadges: boolean; // default: true
}
```

### Testing Requirements

#### Unit Tests Needed
1. **Command Parser Tests**
   - Single-line shell commands
   - Multi-line shell commands
   - Here-doc syntax
   - Line continuations (trailing `\`)
   - Edge cases (empty commands, whitespace)

2. **ANSI Processing Tests**
   - Color code stripping
   - Color code conversion to HTML
   - Mixed content handling
   - Performance with large outputs

3. **History Management Tests**
   - Storage/retrieval
   - Deduplication
   - MRU ordering
   - Limit enforcement

#### Integration Tests Needed
1. **End-to-end Shell Command Flow**
   - Input → Execution → Output rendering
   - Error handling scenarios
   - Multi-line command execution

2. **Keyboard Shortcut Tests**
   - Multi-line toggle
   - History navigation
   - Custom shortcut handling

3. **UI Component Tests**
   - Status indicator rendering
   - History picker functionality
   - Responsive design

### Performance Considerations

1. **Large Output Handling**
   - Implement virtual scrolling for long outputs
   - Collapse long logs by default
   - Streaming updates via SSE

2. **History Search Performance**
   - Implement efficient fuzzy matching
   - Debounce search input
   - Limit search results

3. **ANSI Rendering Performance**
   - Lazy rendering for visible content
   - Cache parsed ANSI sequences
   - Optimize regex patterns

### Security Considerations

1. **Command History Privacy**
   - Local storage only (no server persistence)
   - Clear history option
   - Opt-out configuration
   - Sanitize commands before storage

2. **Output Sanitization**
   - Strip potentially harmful ANSI sequences
   - Escape HTML in output
   - Handle binary data gracefully

### Documentation Updates Required

1. **API Documentation**
   - Update `docs/API-ENDPOINTS-DOCUMENTATION.md`
   - Document new request/response fields
   - Add shell-specific examples

2. **SSE Events Documentation**
   - Update `docs/SSE-EVENTS-DOCUMENTATION.md`
   - Document shell progress events
   - Add status update examples

3. **User Documentation**
   - Update `README.md` shell section
   - Add keyboard shortcuts reference
   - Document configuration options

### Migration Strategy

1. **Backward Compatibility**
   - Maintain existing API contracts
   - Graceful degradation for old clients
   - Feature flags for new functionality

2. **Progressive Enhancement**
   - Start with basic multi-line support
   - Add ANSI rendering incrementally
   - Implement history as final feature

### Risk Mitigation

1. **Multi-line Parsing Collisions**
   - Clear delimiter rules
   - Comprehensive test coverage
   - Fallback to single-line parsing

2. **Performance Degradation**
   - Implement performance monitoring
   - Add output size limits
   - Provide user controls for rendering

3. **Keyboard Shortcut Conflicts**
   - Customizable shortcuts
   - Platform-specific defaults
   - Conflict detection and resolution

## Implementation Decisions

### Multi-line Syntax
- Use Shift+Enter to insert newlines without sending
- Preserve full multi-line text in command payload
- Strip leading `!` only from first line
- Support here-doc style syntax (`!<<'EOF'`)

### ANSI Rendering Strategy
- Use `strip-ansi` for plaintext fallback
- Use `ansi-to-html` for colorized rendering
- Implement lazy rendering for large outputs
- Provide toggle between colorized and plain text

### History Storage
- Per-session history in localStorage
- Key format: `opencode-shell-history::{sessionId}`
- Default limit: 50 entries
- Store command, timestamp, exit code
- MRU (Most Recently Used) ordering

### Keyboard Shortcuts
- Shift+Enter: Insert newline (multi-line mode)
- Ctrl+Enter: Execute command (from multi-line)
- Ctrl+R: Open history search
- Arrow Up/Down: Navigate history
- Esc: Exit multi-line mode

## Technical Architecture

### Component Hierarchy
1. `CommandParser` - Enhanced to handle multi-line syntax
2. `Input Handler` - Manage multi-line mode and keyboard shortcuts
3. `Shell History Manager` - LocalStorage integration and search
4. `ToolPart` - Enhanced rendering with ANSI support
5. `Status Indicators` - Real-time command state visualization

### State Management
- Session-level shell activity tracking
- Per-session history storage
- Multi-line mode state in input component
- Command execution state for status indicators

### API Integration
- Extend `/session/{id}/shell` endpoint metadata
- Enhance SSE events for shell status updates
- Add command ID for deduplication
- Support streaming output updates

## Testing Strategy
- Unit tests for command parser enhancements
- Integration tests for history functionality
- Component tests for ANSI rendering
- End-to-end tests for multi-line workflows
- Cross-browser compatibility testing

## Performance Considerations
- Lazy rendering for large command outputs
- Debounced history search
- Efficient ANSI parsing for real-time updates
- Memory management for long-running sessions