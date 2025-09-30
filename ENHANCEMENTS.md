# OpenCode Web Enhancement Plan

## Overview

This document outlines the comprehensive plan to enhance opencode-web with proper message part rendering, file viewer improvements, and completion of missing features.

**Last Updated:** 2025-09-30  
**Status:** Phase 1 & 2 Complete ✅  
**Estimated Timeline:** 2-3 weeks

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Critical Issues](#critical-issues)
3. [Implementation Phases](#implementation-phases)
4. [Technical Specifications](#technical-specifications)
5. [Dependencies](#dependencies)
6. [Success Criteria](#success-criteria)

---

## Current State Analysis

### Completed ✅
- Full TanStack Start migration
- All 41+ OpenCode HTTP API endpoints implemented
- Three-layer architecture (HTTP API → Server Functions → Client Service)
- Basic message display (text only)
- File browser with navigation
- Session management
- Project switching
- Model/Agent selection

### TODOs Found (13 items)

| Line | Location | Issue | Status |
|------|----------|-------|--------|
| 123 | `src/app/index.tsx` | Shell command execution | Not implemented |
| 205 | `src/app/index.tsx` | Revert API call | Endpoint exists, needs wiring |
| 228 | `src/app/index.tsx` | Unrevert API call | Endpoint exists, needs wiring |
| 250 | `src/app/index.tsx` | Share session | Endpoint exists, needs wiring |
| 260 | `src/app/index.tsx` | Unshare session | Endpoint exists, needs wiring |
| 270 | `src/app/index.tsx` | Init session | Endpoint exists, needs wiring |
| 280 | `src/app/index.tsx` | Compact session | Endpoint exists, needs wiring |
| 290 | `src/app/index.tsx` | Details toggle | UI state needed |
| 300 | `src/app/index.tsx` | Export session | Needs implementation |
| 310 | `src/app/index.tsx` | Editor integration | Needs design |
| 320 | `src/app/index.tsx` | Exit action | Needs design |
| 496 | `src/app/index.tsx` | Search results display | UI needed |
| 1330 | `src/app/index.tsx` | Server URL configuration | Dialog incomplete |

---

## Critical Issues

### 1. Message Parts Not Displayed ⚠️ CRITICAL

The OpenCode API returns rich message parts (`Part[]`) but we only display plain text.

**Missing Part Types:**

| Part Type | Description | Current Status |
|-----------|-------------|----------------|
| `TextPart` | Regular text content | ✅ Displayed |
| `ReasoningPart` | Thinking tokens/reasoning | ❌ NOT displayed |
| `ToolPart` | Tool calls with state tracking | ❌ NOT displayed |
| `FilePart` | File attachments | ❌ NOT displayed |
| `StepStartPart` | Step boundary markers | ❌ NOT displayed |
| `StepFinishPart` | Step completion with metrics | ❌ NOT displayed |
| `SnapshotPart` | File system snapshots | ❌ NOT displayed |
| `PatchPart` | Git diffs/patches | ❌ NOT displayed |
| `AgentPart` | Agent switching indicators | ❌ NOT displayed |

**Impact:**
- Users cannot see what tools are being executed
- No visibility into AI thinking process
- Missing file change diffs
- No step-by-step execution visibility
- Poor debugging experience

### 2. File Viewer Limitations

Current file viewer is plain text only:
- ❌ No syntax highlighting
- ❌ No image preview
- ❌ No git diff rendering
- ❌ No line numbers
- ❌ No file type detection
- ❌ No copy/download buttons

### 3. Event Streaming Not Implemented

The `/event` SSE endpoint exists but is not used:
- ❌ No real-time message updates
- ❌ No live tool execution progress
- ❌ No session change notifications
- ❌ No permission request handling
- Requires manual page refresh for updates

---

## Implementation Phases

### Phase 1: Message Parts Display System ✅ COMPLETED

**Goal:** Properly render all 9 message part types with rich UI

**Status:** ✅ Complete (2025-09-30)

#### Task 1.1: Create Message Part Component Architecture

**New Directory Structure:**
```
src/app/_components/message/
├── MessagePart.tsx          # Main part router component
├── TextPart.tsx            # Text content (migrate existing)
├── ReasoningPart.tsx       # Thinking blocks (collapsible)
├── ToolPart.tsx            # Tool execution display
├── FilePart.tsx            # Attachment preview
├── StepPart.tsx            # Step boundaries with metrics
├── PatchPart.tsx           # Git diff viewer
├── AgentPart.tsx           # Agent indicator badge
├── SnapshotPart.tsx        # Snapshot indicator
└── index.ts                # Exports
```

**Component Specifications:**

##### `MessagePart.tsx` - Router Component
```typescript
interface MessagePartProps {
  part: Part
  messageRole: 'user' | 'assistant'
}

export function MessagePart({ part, messageRole }: MessagePartProps) {
  switch (part.type) {
    case 'text':
      return <TextPart part={part} />
    case 'reasoning':
      return <ReasoningPart part={part} />
    case 'tool':
      return <ToolPart part={part} />
    case 'file':
      return <FilePart part={part} />
    case 'step-start':
    case 'step-finish':
      return <StepPart part={part} />
    case 'patch':
      return <PatchPart part={part} />
    case 'agent':
      return <AgentPart part={part} />
    case 'snapshot':
      return <SnapshotPart part={part} />
    default:
      return null
  }
}
```

##### `ReasoningPart.tsx` - Thinking Blocks
**Features:**
- Collapsible section (default: collapsed)
- "🧠 Thinking..." header with expand/collapse icon
- Monospace text for reasoning content
- Token count badge if available
- Subtle background color to differentiate from regular text

**UI Mockup:**
```
┌─────────────────────────────────────────┐
│ 🧠 Thinking... [+]              [23 tok]│
└─────────────────────────────────────────┘

When expanded:
┌─────────────────────────────────────────┐
│ 🧠 Thinking... [-]              [23 tok]│
├─────────────────────────────────────────┤
│ Let me analyze this request...          │
│ The user wants to implement...          │
│ I should start by...                    │
└─────────────────────────────────────────┘
```

##### `ToolPart.tsx` - Tool Execution Display
**Features:**
- State-based rendering:
  - `pending`: Gray "⏳ Queued" badge
  - `running`: Blue spinner + "⚙️ Running..." + title
  - `completed`: Green checkmark + tool name + execution time
  - `error`: Red X + error message
- Collapsible input/output sections
- Syntax-highlighted JSON for structured data
- Metadata display (timing, etc.)
- Progress indication for long-running tools

**UI Mockup:**
```
Running state:
┌─────────────────────────────────────────┐
│ ⚙️ Running: edit_file                   │
│ ⏱️  Started 2s ago                       │
│ ─ Input ────────────────────────────────│
│   {                                     │
│     "path": "src/app.tsx",              │
│     "content": "..."                    │
│   }                                     │
└─────────────────────────────────────────┘

Completed state:
┌─────────────────────────────────────────┐
│ ✅ edit_file                    [1.2s]  │
│ ─ Output ───────────────────────────────│
│   Successfully edited src/app.tsx       │
│   Modified 15 lines                     │
└─────────────────────────────────────────┘

Error state:
┌─────────────────────────────────────────┐
│ ❌ bash                          [0.5s] │
│ ─ Error ────────────────────────────────│
│   Command failed with exit code 1       │
│   Permission denied                     │
└─────────────────────────────────────────┘
```

##### `FilePart.tsx` - File Attachments
**Features:**
- Image preview for image MIME types
- Download button for all files
- File metadata (size, type)
- Source information if available (from file/symbol)

##### `StepPart.tsx` - Step Boundaries
**Features:**
- Visual separator between AI reasoning steps
- Display token usage and cost per step
- Show cache hit information
- Step timing

##### `PatchPart.tsx` - Git Diff Viewer
**Features:**
- Side-by-side or unified diff view
- Syntax highlighting for code
- File list with change indicators
- Show added/removed line counts

##### `AgentPart.tsx` - Agent Indicators
**Features:**
- Badge showing agent name
- Show when agent switches occur
- Visual indicator in message flow

#### Task 1.2: Update Message Data Model

**File:** `src/hooks/useOpenCode.ts`

**Changes:**
```typescript
interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string  // Keep for backwards compatibility
  timestamp: Date
  parts?: Part[]   // ADD: Store all message parts
  metadata?: {
    tokens?: { input: number; output: number; reasoning: number }
    cost?: number
    model?: string
    agent?: string
  }
}
```

**Update `loadMessages()`:**
```typescript
const loadMessages = useCallback(async (sessionId: string) => {
  const response = await openCodeService.getMessages(sessionId)
  const messagesArray = (response.data as unknown as OpenCodeMessage[]) || []
  
  const loadedMessages: Message[] = messagesArray.map((msg, index) => {
    // Keep parts array intact
    const parts = msg.parts || []
    
    // Extract text for backwards compatibility
    const textPart = parts.find((part: Part) => part.type === 'text')
    const content = (textPart && 'text' in textPart ? textPart.text : '') || ''
    
    return {
      id: msg.info?.id || `msg-${index}`,
      type: msg.info?.role === 'user' ? 'user' : 'assistant',
      content,
      parts, // ADD: Preserve all parts
      timestamp: new Date(msg.info?.time?.created || Date.now()),
      metadata: msg.info?.role === 'assistant' ? {
        tokens: msg.info.tokens,
        cost: msg.info.cost,
        model: msg.info.modelID,
        agent: msg.info.mode
      } : undefined
    }
  })
  
  setMessages(loadedMessages)
}, [])
```

**Update `sendMessage()`:**
```typescript
const sendMessage = useCallback(async (content: string, providerID?: string, modelID?: string) => {
  // ... existing code ...
  
  const response = await openCodeService.sendMessage(currentSession.id, content, providerID, modelID)
  const data = response.data
  
  const assistantMessage: Message = {
    id: data.info.id,
    type: 'assistant',
    content: extractTextContent(data.parts), // Extract for display
    parts: data.parts, // ADD: Store all parts
    timestamp: new Date(),
    metadata: {
      tokens: data.info.tokens,
      cost: data.info.cost,
      model: data.info.modelID,
      agent: data.info.mode
    }
  }
  
  setMessages(prev => [...prev, assistantMessage])
}, [currentSession])
```

#### Task 1.3: Update Chat Display UI

**File:** `src/app/index.tsx` (lines 974-1001)

**Replace simple text display with part rendering:**

```typescript
// OLD (lines 974-1001):
<Pre size="small" className="break-words whitespace-pre-wrap">
  {message.content}
</Pre>

// NEW:
{message.parts && message.parts.length > 0 ? (
  <div className="space-y-2">
    {message.parts.map((part, idx) => (
      <MessagePart 
        key={`${part.id || idx}`} 
        part={part}
        messageRole={message.type}
      />
    ))}
    
    {/* Show metadata if available */}
    {message.metadata && (
      <div className="text-xs opacity-60 mt-2 flex gap-4">
        {message.metadata.agent && (
          <span>Agent: {message.metadata.agent}</span>
        )}
        {message.metadata.tokens && (
          <span>
            Tokens: {message.metadata.tokens.input + message.metadata.tokens.output}
            {message.metadata.tokens.reasoning > 0 && 
              ` (+${message.metadata.tokens.reasoning} reasoning)`
            }
          </span>
        )}
        {message.metadata.cost && (
          <span>Cost: ${message.metadata.cost.toFixed(4)}</span>
        )}
      </div>
    )}
  </div>
) : (
  // Fallback for messages without parts
  <Pre size="small" className="break-words whitespace-pre-wrap">
    {message.content}
  </Pre>
)}
```

**Estimated Effort:** 2-3 days  
**Priority:** 🔴 Critical  
**Dependencies:** OpenCode SDK types

---

### Phase 2: File Viewer Enhancements ✅ COMPLETED

**Goal:** Professional code viewer with syntax highlighting, image support, and diff rendering

**Status:** ✅ Complete (2025-09-30)

#### Task 2.1: Add Syntax Highlighting

**Library Choice:** `highlight.js` (lightweight, no SSR issues)

**Installation:**
```bash
npm install highlight.js @types/highlight.js
```

**Implementation:**
```typescript
// src/lib/highlight.ts
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

const EXTENSION_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  cs: 'csharp',
  php: 'php',
  sh: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  json: 'json',
  xml: 'xml',
  html: 'xml',
  css: 'css',
  scss: 'scss',
  md: 'markdown',
  sql: 'sql',
  // Add more as needed
}

export function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  return ext ? EXTENSION_MAP[ext] || 'plaintext' : 'plaintext'
}

export function highlightCode(code: string, language: string): string {
  try {
    if (language && language !== 'plaintext' && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value
    }
  } catch (e) {
    console.error('Highlight error:', e)
  }
  return hljs.highlightAuto(code).value
}
```

**Update File Viewer (src/app/index.tsx:1097-1129):**
```typescript
import { detectLanguage, highlightCode } from '@/lib/highlight'

// Inside file viewer rendering:
{selectedFile ? (
  <>
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-medium flex items-center gap-2">
        {selectedFile.split("/").pop()}
        <Badge variant="foreground0" cap="round" className="text-xs">
          {detectLanguage(selectedFile)}
        </Badge>
      </h3>
      <div className="flex gap-2">
        <Button
          variant="foreground0"
          box="round"
          onClick={() => {
            navigator.clipboard.writeText(fileContent || '')
          }}
          size="small"
        >
          Copy
        </Button>
        <Button
          variant="foreground0"
          box="round"
          onClick={() => setSelectedFile(null)}
          size="small"
        >
          Close
        </Button>
      </div>
    </div>
    <div className="flex-1 overflow-hidden">
      <Pre
        size="small"
        className="hljs bg-[#313244] p-4 rounded text-[#cdd6f4] overflow-y-auto scrollbar h-full"
        dangerouslySetInnerHTML={{
          __html: highlightCode(
            fileContent ?? '',
            detectLanguage(selectedFile)
          )
        }}
      />
    </div>
  </>
) : (
  // ... no file selected ...
)}
```

#### Task 2.2: Image Preview Support

**Implementation:**
```typescript
// Add image detection utility
function isImageFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase()
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext || '')
}

// In file viewer:
{selectedFile && (
  isImageFile(selectedFile) ? (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">
          {selectedFile.split("/").pop()}
        </h3>
        <Button
          variant="foreground0"
          box="round"
          onClick={() => setSelectedFile(null)}
          size="small"
        >
          Close
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-auto bg-[#313244] rounded p-4">
        <img
          src={`data:image/*;base64,${btoa(fileContent || '')}`}
          alt={selectedFile}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    </>
  ) : (
    // ... code viewer ...
  )
)}
```

#### Task 2.3: Git Diff Rendering

**Library:** `diff2html`

**Installation:**
```bash
npm install diff2html
```

**Implementation:**
```typescript
import { html } from 'diff2html'
import 'diff2html/bundles/css/diff2html.min.css'

// Update readFile to handle patch responses
const handleFileSelect = async (filePath: string) => {
  try {
    const response = await readFile(filePath)
    
    // Check if response has patch data
    if (response && typeof response === 'object' && 'patch' in response) {
      setSelectedFile(filePath)
      setFileContent(response.content || '')
      setFilePatch(response.patch) // NEW state
      setFileDiff(response.diff)   // NEW state
    } else {
      setSelectedFile(filePath)
      setFileContent(response || "Unable to read file")
      setFilePatch(null)
      setFileDiff(null)
    }
  } catch (err) {
    console.error("Failed to read file:", err)
    setFileContent("Error reading file")
  }
}

// Render diff if available
{filePatch ? (
  <div 
    className="flex-1 overflow-auto"
    dangerouslySetInnerHTML={{
      __html: html(fileDiff || '', {
        drawFileList: false,
        matching: 'lines',
        outputFormat: 'side-by-side',
        renderNothingWhenEmpty: false
      })
    }}
  />
) : (
  // ... regular code view ...
)}
```

#### Task 2.4: Line Numbers & Metadata

**Features:**
- Line numbers in gutter
- File size display
- Last modified date
- Keyboard shortcut hints

**Implementation:**
```typescript
function addLineNumbers(code: string): string {
  const lines = code.split('\n')
  return lines
    .map((line, i) => `<span class="line-number">${i + 1}</span>${line}`)
    .join('\n')
}

// Add CSS for line numbers:
// .line-number { 
//   display: inline-block; 
//   width: 3em; 
//   text-align: right; 
//   margin-right: 1em; 
//   opacity: 0.5; 
// }
```

**Estimated Effort:** 1-2 days  
**Priority:** 🟡 High  
**Dependencies:** highlight.js, diff2html

---

### Phase 3: Complete Missing Command Implementations 🟢 MEDIUM PRIORITY

**Goal:** Wire up all existing API endpoints to UI commands

#### Task 3.1: Implement Shell Command Execution

**File:** `src/app/index.tsx` (line 123)

**Implementation:**
```typescript
const handleShellCommand = async (command: string) => {
  if (!currentSession) {
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: "No active session. Create a session first.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
    return
  }
  
  try {
    setLoading(true)
    
    // Add user message showing the command
    const userMessage = {
      id: `user-${Date.now()}`,
      type: "user" as const,
      content: `$ ${command}`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    
    // Execute via API
    const response = await openCodeService.runCommand(
      currentSession.id,
      command,
      []
    )
    
    // Add assistant response with output
    const assistantMessage = {
      id: response.info.id,
      type: "assistant" as const,
      content: extractTextContent(response.parts),
      parts: response.parts,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, assistantMessage])
    
  } catch (error) {
    console.error('Failed to execute shell command:', error)
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: `Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
  } finally {
    setLoading(false)
  }
}
```

#### Task 3.2: Wire Revert/Unrevert Commands

**File:** `src/app/index.tsx` (lines 205, 228)

**Implementation:**
```typescript
case "undo":
  if (!currentSession || messages.length === 0) {
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: "No messages to undo.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
    break
  }
  
  try {
    // Get last assistant message
    const lastAssistantMsg = [...messages]
      .reverse()
      .find(m => m.type === 'assistant')
    
    if (!lastAssistantMsg) {
      throw new Error('No assistant message to revert')
    }
    
    // Call revert API
    await openCodeService.revertMessage(
      currentSession.id,
      lastAssistantMsg.id
    )
    
    // Reload messages to see reverted state
    await loadMessages(currentSession.id)
    
    // Reload files if in files tab
    if (activeTab === 'files') {
      await loadFiles(fileDirectory)
    }
    
    const successMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: "✅ Undid last message and reverted file changes.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, successMsg])
  } catch (error) {
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: `Undo failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
  }
  break

case "redo":
  if (!currentSession) {
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: "No active session.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
    break
  }
  
  try {
    await openCodeService.unrevertSession(currentSession.id)
    await loadMessages(currentSession.id)
    
    if (activeTab === 'files') {
      await loadFiles(fileDirectory)
    }
    
    const successMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: "✅ Restored reverted changes.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, successMsg])
  } catch (error) {
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: `Redo failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
  }
  break
```

#### Task 3.3: Implement Share/Unshare

**File:** `src/app/index.tsx` (lines 250, 260)

**Implementation:**
```typescript
case "share":
  if (!currentSession) {
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: "No active session to share.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
    break
  }
  
  try {
    const sharedSession = await openCodeService.shareSession(currentSession.id)
    
    const shareUrl = sharedSession.share?.url || 'No URL available'
    
    // Copy to clipboard
    await navigator.clipboard.writeText(shareUrl)
    
    const successMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: `✅ Session shared!\n\nURL: ${shareUrl}\n\n(Copied to clipboard)`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, successMsg])
    
    // Update current session with share info
    setCurrentSession(sharedSession)
  } catch (error) {
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: `Share failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
  }
  break

case "unshare":
  if (!currentSession) {
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: "No active session.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
    break
  }
  
  try {
    const unsharedSession = await openCodeService.unshareSession(currentSession.id)
    
    const successMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: "✅ Session is no longer shared.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, successMsg])
    
    setCurrentSession(unsharedSession)
  } catch (error) {
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: `Unshare failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
  }
  break
```

#### Task 3.4: Implement Init Command

**File:** `src/app/index.tsx` (line 270)

**Purpose:** Generate/update `AGENTS.md` file for the project

**Implementation:**
```typescript
case "init":
  if (!currentSession || !selectedModel) {
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: "Need an active session and selected model.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
    break
  }
  
  try {
    // Get the last message ID to use as context
    const lastMessage = messages[messages.length - 1]
    const messageID = lastMessage?.id || ''
    
    await openCodeService.initSession(
      currentSession.id,
      messageID,
      selectedModel.providerID,
      selectedModel.modelID
    )
    
    const successMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: "✅ Project initialized. AGENTS.md has been created/updated.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, successMsg])
    
    // Refresh files if in files tab
    if (activeTab === 'files') {
      await loadFiles(fileDirectory)
    }
  } catch (error) {
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: `Init failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
  }
  break
```

#### Task 3.5: Implement Compact Command

**File:** `src/app/index.tsx` (line 280)

**Purpose:** Summarize long sessions to reduce token usage

**Implementation:**
```typescript
case "compact":
  if (!currentSession) {
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: "No active session to compact.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
    break
  }
  
  try {
    setLoading(true)
    
    const infoMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: "🔄 Compacting session... This may take a moment.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, infoMsg])
    
    await openCodeService.summarizeSession(currentSession.id)
    
    // Reload messages to see compacted version
    await loadMessages(currentSession.id)
    
    const successMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: "✅ Session compacted successfully.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, successMsg])
  } catch (error) {
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: `Compact failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
  } finally {
    setLoading(false)
  }
  break
```

#### Task 3.6: Implement Details Toggle

**File:** `src/app/index.tsx` (line 290)

**Purpose:** Show/hide detailed information (tool inputs, reasoning, etc.)

**Implementation:**
```typescript
// Add state at top of component
const [showDetails, setShowDetails] = useState(true)

// In command handler:
case "details":
  setShowDetails(prev => !prev)
  const detailsMsg = {
    id: `assistant-${Date.now()}`,
    type: "assistant" as const,
    content: `Details ${showDetails ? 'hidden' : 'shown'}.`,
    timestamp: new Date(),
  }
  setMessages((prev) => [...prev, detailsMsg])
  break

// Pass showDetails to MessagePart components
<MessagePart 
  part={part}
  messageRole={message.type}
  showDetails={showDetails}  // NEW
/>

// In ToolPart.tsx, ReasoningPart.tsx, etc:
// Only show detailed info when showDetails === true
```

#### Task 3.7: Implement Export Command

**File:** `src/app/index.tsx` (line 300)

**Purpose:** Export session as markdown or JSON

**Implementation:**
```typescript
case "export":
  if (!currentSession || messages.length === 0) {
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: "No session to export.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
    break
  }
  
  try {
    // Generate markdown export
    let markdown = `# ${currentSession.title || currentSession.id}\n\n`
    markdown += `Project: ${currentProject?.worktree || 'Unknown'}\n`
    markdown += `Created: ${currentSession.createdAt?.toLocaleString()}\n`
    markdown += `Messages: ${messages.length}\n\n`
    markdown += `---\n\n`
    
    messages.forEach((msg, idx) => {
      const role = msg.type === 'user' ? '**User**' : '**Assistant**'
      markdown += `## Message ${idx + 1} - ${role}\n\n`
      markdown += `_${msg.timestamp.toLocaleString()}_\n\n`
      
      if (msg.parts && msg.parts.length > 0) {
        msg.parts.forEach(part => {
          if (part.type === 'text' && 'text' in part) {
            markdown += `${part.text}\n\n`
          } else if (part.type === 'tool' && 'tool' in part) {
            markdown += `**Tool:** ${part.tool}\n`
            markdown += `**Status:** ${part.state.status}\n\n`
          }
        })
      } else {
        markdown += `${msg.content}\n\n`
      }
      
      markdown += `---\n\n`
    })
    
    // Download as file
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentSession.title || 'session'}-${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    const successMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: "✅ Session exported as markdown.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, successMsg])
  } catch (error) {
    const errorMsg = {
      id: `assistant-${Date.now()}`,
      type: "assistant" as const,
      content: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, errorMsg])
  }
  break
```

#### Task 3.8: Implement Search Results Display

**File:** `src/app/index.tsx` (line 496)

**Implementation:**
```typescript
// Add state
const [searchResults, setSearchResults] = useState<string[]>([])
const [showSearchResults, setShowSearchResults] = useState(false)

// Update handler
const handleFileSearch = async () => {
  if (!fileSearchQuery.trim()) return
  try {
    const results = await searchFiles(fileSearchQuery)
    setSearchResults(results)
    setShowSearchResults(true)
  } catch (err) {
    console.error("Failed to search files:", err)
  }
}

// Add search results panel (in sidebar, below search input)
{showSearchResults && searchResults.length > 0 && (
  <div className="mt-2">
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm font-medium">
        Results ({searchResults.length})
      </span>
      <Button
        variant="foreground0"
        box="round"
        size="small"
        onClick={() => setShowSearchResults(false)}
      >
        ✕
      </Button>
    </div>
    <div className="space-y-1 max-h-48 overflow-y-auto scrollbar">
      {searchResults.map((filePath, idx) => (
        <div
          key={idx}
          className="p-2 bg-[#1e1e2e] hover:bg-[#45475a] rounded cursor-pointer text-sm"
          onClick={() => {
            void handleFileSelect(filePath)
            setShowSearchResults(false)
          }}
        >
          {filePath}
        </div>
      ))}
    </div>
  </div>
)}
```

**Estimated Effort:** 1 day  
**Priority:** 🟢 Medium  
**Dependencies:** None (all endpoints exist)

---

### Phase 4: Event Streaming (Real-time Updates) 🔵 MEDIUM PRIORITY

**Goal:** Implement SSE for live updates without page refresh

#### Task 4.1: Create Event Stream Hook

**New File:** `src/hooks/useEventStream.ts`

```typescript
import { useEffect, useRef } from 'react'

const OPENCODE_SERVER_URL = import.meta.env.VITE_OPENCODE_SERVER_URL || 'http://localhost:4096'

interface EventHandlers {
  onMessageUpdated?: (data: any) => void
  onMessagePartUpdated?: (data: any) => void
  onSessionUpdated?: (data: any) => void
  onSessionDeleted?: (data: any) => void
  onPermissionUpdated?: (data: any) => void
  onFileEdited?: (data: any) => void
  onError?: (error: Error) => void
}

export function useEventStream(
  directory: string | undefined,
  handlers: EventHandlers
) {
  const eventSourceRef = useRef<EventSource | null>(null)
  
  useEffect(() => {
    if (!directory) return
    
    const url = new URL(`${OPENCODE_SERVER_URL}/event`)
    url.searchParams.set('directory', directory)
    
    const eventSource = new EventSource(url.toString())
    eventSourceRef.current = eventSource
    
    eventSource.addEventListener('message.updated', (event) => {
      try {
        const data = JSON.parse(event.data)
        handlers.onMessageUpdated?.(data.properties)
      } catch (error) {
        console.error('Failed to parse message.updated event:', error)
      }
    })
    
    eventSource.addEventListener('message.part.updated', (event) => {
      try {
        const data = JSON.parse(event.data)
        handlers.onMessagePartUpdated?.(data.properties)
      } catch (error) {
        console.error('Failed to parse message.part.updated event:', error)
      }
    })
    
    eventSource.addEventListener('session.updated', (event) => {
      try {
        const data = JSON.parse(event.data)
        handlers.onSessionUpdated?.(data.properties)
      } catch (error) {
        console.error('Failed to parse session.updated event:', error)
      }
    })
    
    eventSource.addEventListener('session.deleted', (event) => {
      try {
        const data = JSON.parse(event.data)
        handlers.onSessionDeleted?.(data.properties)
      } catch (error) {
        console.error('Failed to parse session.deleted event:', error)
      }
    })
    
    eventSource.addEventListener('permission.updated', (event) => {
      try {
        const data = JSON.parse(event.data)
        handlers.onPermissionUpdated?.(data.properties)
      } catch (error) {
        console.error('Failed to parse permission.updated event:', error)
      }
    })
    
    eventSource.addEventListener('file.edited', (event) => {
      try {
        const data = JSON.parse(event.data)
        handlers.onFileEdited?.(data.properties)
      } catch (error) {
        console.error('Failed to parse file.edited event:', error)
      }
    })
    
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error)
      handlers.onError?.(new Error('Event stream connection error'))
    }
    
    return () => {
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [directory, handlers])
  
  return eventSourceRef
}
```

#### Task 4.2: Integrate Event Stream in Main Component

**File:** `src/app/index.tsx`

```typescript
import { useEventStream } from '@/hooks/useEventStream'

// Inside OpenCodeChatTUI component:

useEventStream(currentProject?.worktree, {
  onMessageUpdated: (data) => {
    // Update message in state
    setMessages(prev => 
      prev.map(msg => 
        msg.id === data.info.id 
          ? { ...msg, ...convertMessageFromAPI(data.info) }
          : msg
      )
    )
  },
  
  onMessagePartUpdated: (data) => {
    // Update specific part in message
    setMessages(prev =>
      prev.map(msg => {
        if (msg.id === data.part.messageID) {
          const updatedParts = msg.parts?.map(part =>
            part.id === data.part.id ? data.part : part
          ) || []
          return { ...msg, parts: updatedParts }
        }
        return msg
      })
    )
  },
  
  onSessionUpdated: (data) => {
    // Update session in sessions list
    setSessions(prev =>
      prev.map(s => s.id === data.info.id ? convertSessionFromAPI(data.info) : s)
    )
    
    // Update current session if it matches
    if (currentSession?.id === data.info.id) {
      setCurrentSession(convertSessionFromAPI(data.info))
    }
  },
  
  onSessionDeleted: (data) => {
    setSessions(prev => prev.filter(s => s.id !== data.info.id))
    
    if (currentSession?.id === data.info.id) {
      setCurrentSession(null)
      setMessages([])
    }
  },
  
  onPermissionUpdated: (data) => {
    // Show permission dialog
    // This would require creating a permission dialog component
    console.log('Permission request:', data)
  },
  
  onFileEdited: (data) => {
    // Refresh file list if we're viewing files
    if (activeTab === 'files') {
      void loadFiles(fileDirectory)
    }
  },
  
  onError: (error) => {
    console.error('Event stream error:', error)
    setIsConnected(false)
  }
})
```

#### Task 4.3: Add Permission Request Handler

**New Component:** `src/app/_components/PermissionDialog.tsx`

```typescript
interface PermissionDialogProps {
  permission: Permission
  onRespond: (response: 'once' | 'always' | 'reject') => void
}

export function PermissionDialog({ permission, onRespond }: PermissionDialogProps) {
  return (
    <Dialog open={true} onClose={() => onRespond('reject')}>
      <View box="square" className="p-6 max-w-md w-full">
        <h2 className="text-lg font-bold mb-4">Permission Required</h2>
        <Separator className="mb-4" />
        
        <div className="mb-4">
          <p className="text-sm mb-2">
            <strong>Type:</strong> {permission.type}
          </p>
          {permission.pattern && (
            <p className="text-sm mb-2">
              <strong>Pattern:</strong> {permission.pattern}
            </p>
          )}
          <p className="text-sm">
            <strong>Reason:</strong> {permission.title}
          </p>
        </div>
        
        <Separator className="mb-4" />
        
        <div className="flex gap-2">
          <Button
            variant="foreground0"
            box="round"
            onClick={() => onRespond('once')}
            className="flex-1"
          >
            Allow Once
          </Button>
          <Button
            variant="foreground0"
            box="round"
            onClick={() => onRespond('always')}
            className="flex-1"
          >
            Always Allow
          </Button>
          <Button
            variant="foreground0"
            box="round"
            onClick={() => onRespond('reject')}
            className="flex-1"
          >
            Deny
          </Button>
        </div>
      </View>
    </Dialog>
  )
}
```

**Estimated Effort:** 2-3 days  
**Priority:** 🔵 Medium  
**Dependencies:** Server-Sent Events support

---

### Phase 5: UI/UX Polish 🟣 LOW PRIORITY

**Goal:** Professional finish with better UX patterns

#### Task 5.1: Loading States & Skeletons

**Create:** `src/app/_components/SkeletonLoader.tsx`

```typescript
export function MessageSkeleton() {
  return (
    <div className="flex justify-start animate-pulse">
      <div className="max-w-2xl p-3 bg-[var(--theme-backgroundAlt)] rounded">
        <div className="h-4 bg-[var(--theme-background)] rounded w-64 mb-2" />
        <div className="h-4 bg-[var(--theme-background)] rounded w-48 mb-2" />
        <div className="h-4 bg-[var(--theme-background)] rounded w-56" />
      </div>
    </div>
  )
}

export function FileSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 bg-[#1e1e2e] rounded" />
      ))}
    </div>
  )
}
```

**Use in components:**
```typescript
{loading && <MessageSkeleton />}
{filesLoading ? <FileSkeleton /> : <FileList files={files} />}
```

#### Task 5.2: Keyboard Shortcuts

**Create:** `src/hooks/useKeyboardShortcuts.ts`

```typescript
import { useEffect } from 'react'

export function useKeyboardShortcuts(handlers: {
  onHelp?: () => void
  onNewSession?: () => void
  onModels?: () => void
  onThemes?: () => void
  onSessions?: () => void
  onAgents?: () => void
}) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+/ or Cmd+/ for help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        handlers.onHelp?.()
      }
      
      // Ctrl+N or Cmd+N for new session
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        handlers.onNewSession?.()
      }
      
      // Ctrl+K or Cmd+K for models
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        handlers.onModels?.()
      }
      
      // Ctrl+T or Cmd+T for themes
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault()
        handlers.onThemes?.()
      }
      
      // Ctrl+P or Cmd+P for sessions
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        handlers.onSessions?.()
      }
      
      // Ctrl+A or Cmd+A for agents
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        handlers.onAgents?.()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handlers])
}
```

**Use in main component:**
```typescript
useKeyboardShortcuts({
  onHelp: () => setShowHelp(true),
  onNewSession: () => void handleCreateSession(),
  onModels: () => setShowModelPicker(true),
  onThemes: () => setShowThemes(true),
  onSessions: () => setShowSessionPicker(true),
  onAgents: () => setShowAgentPicker(true)
})
```

#### Task 5.3: Toast Notifications

**Create:** `src/hooks/useToast.ts`

```typescript
import { useState, useCallback } from 'react'

interface Toast {
  id: string
  message: string
  variant: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  
  const addToast = useCallback((
    message: string,
    variant: Toast['variant'] = 'info',
    duration = 3000
  ) => {
    const id = `toast-${Date.now()}`
    const toast = { id, message, variant, duration }
    
    setToasts(prev => [...prev, toast])
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
  }, [])
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])
  
  return { toasts, addToast, removeToast }
}
```

#### Task 5.4: Better Error Messages

**Create:** `src/lib/error-messages.ts`

```typescript
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Parse specific error types
    if (error.message.includes('401') || error.message.includes('auth')) {
      return 'Authentication failed. Please check your API credentials.'
    }
    if (error.message.includes('404')) {
      return 'Resource not found. It may have been deleted.'
    }
    if (error.message.includes('500')) {
      return 'Server error. Please try again later.'
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network error. Check your connection to the OpenCode server.'
    }
    return error.message
  }
  return 'An unknown error occurred.'
}
```

#### Task 5.5: Responsive Design Improvements

**Areas to improve:**
- Mobile-friendly sidebar (collapsible)
- Touch-friendly buttons and inputs
- Better tablet layout
- Responsive font sizes

**Estimated Effort:** 1-2 days  
**Priority:** 🟣 Low  
**Dependencies:** None

---

## Technical Specifications

### New Dependencies Required

```json
{
  "dependencies": {
    "highlight.js": "^11.9.0",
    "diff2html": "^3.4.47",
    "date-fns": "^3.3.1"
  },
  "devDependencies": {
    "@types/highlight.js": "^11.0.0"
  }
}
```

### Optional Dependencies

```json
{
  "dependencies": {
    "react-markdown": "^9.0.1",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.17.19"
  }
}
```

### File Structure Changes

**New Files:**
```
src/
├── app/
│   └── _components/
│       ├── message/            # NEW
│       │   ├── MessagePart.tsx
│       │   ├── TextPart.tsx
│       │   ├── ReasoningPart.tsx
│       │   ├── ToolPart.tsx
│       │   ├── FilePart.tsx
│       │   ├── StepPart.tsx
│       │   ├── PatchPart.tsx
│       │   ├── AgentPart.tsx
│       │   ├── SnapshotPart.tsx
│       │   └── index.ts
│       ├── PermissionDialog.tsx  # NEW
│       └── SkeletonLoader.tsx    # NEW
├── hooks/
│   ├── useEventStream.ts         # NEW
│   ├── useKeyboardShortcuts.ts   # NEW
│   └── useToast.ts               # NEW
└── lib/
    ├── highlight.ts              # NEW
    └── error-messages.ts         # NEW
```

---

## Success Criteria

### Phase 1: Message Parts Display
- ✅ All 9 Part types render with appropriate UI
- ✅ Tool execution shows state (pending/running/completed/error)
- ✅ Reasoning blocks are collapsible
- ✅ File attachments display properly
- ✅ Metadata (tokens, cost, timing) is visible

### Phase 2: File Viewer
- ✅ Syntax highlighting works for 20+ languages
- ✅ Images display inline
- ⏸️ Git diffs render with side-by-side view (deferred - requires file API changes)
- ⏸️ Line numbers shown (deferred - can add if requested)
- ✅ Copy button works for code files

### Phase 3: Commands
- ✅ All 13 TODOs resolved
- ✅ Shell commands execute and display output
- ✅ Undo/redo works with file system changes
- ✅ Share generates URLs and copies to clipboard
- ✅ Export downloads markdown files

### Phase 4: Event Streaming
- ✅ Real-time message updates work
- ✅ Tool progress updates live
- ✅ Session changes reflect immediately
- ✅ Permission requests show dialog
- ✅ Reconnects automatically on disconnect

### Phase 5: Polish
- ✅ Loading states show skeletons
- ✅ Keyboard shortcuts work
- ✅ Toast notifications appear
- ✅ Error messages are user-friendly
- ✅ UI is responsive on mobile

---

## Timeline

### Week 1 (Critical Features)
- **Days 1-3:** Phase 1 - Message Parts Display
  - Day 1: Component architecture + TextPart + ReasoningPart
  - Day 2: ToolPart + FilePart
  - Day 3: StepPart + PatchPart + AgentPart + Integration

### Week 2 (High Priority)
- **Days 4-5:** Phase 2 - File Viewer
  - Day 4: Syntax highlighting + image preview
  - Day 5: Git diff rendering + line numbers
- **Days 6-7:** Phase 3 - Commands
  - Day 6: Shell, revert/unrevert, share/unshare
  - Day 7: Init, compact, details, export, search UI

### Week 3 (Medium/Low Priority)
- **Days 8-10:** Phase 4 - Event Streaming
  - Day 8: Event stream hook + basic integration
  - Day 9: Real-time updates for messages/tools
  - Day 10: Permission handling + reconnection
- **Days 11-12:** Phase 5 - Polish
  - Day 11: Loading states, keyboard shortcuts
  - Day 12: Toast notifications, error handling, responsive design

---

## Risk Assessment

### High Risk
- **Message Part Types:** Complex state management for tool execution states
- **Event Streaming:** Browser SSE limitations, reconnection logic
- **Git Diff Rendering:** Large diffs may impact performance

### Medium Risk
- **Syntax Highlighting:** May need performance optimization for large files
- **Real-time Updates:** Race conditions with manual refreshes

### Low Risk
- **Command Implementations:** All endpoints tested and working
- **UI Polish:** Straightforward improvements

---

## Testing Strategy

### Unit Tests
- Message part rendering
- Command handlers
- Event stream parsing

### Integration Tests
- End-to-end command flows
- Real-time update propagation
- File viewer with different file types

### Manual Testing Checklist
- [ ] All part types render correctly
- [ ] Tool states update in real-time
- [ ] Syntax highlighting works for common languages
- [ ] Image files display properly
- [ ] Git diffs are readable
- [ ] All commands execute successfully
- [ ] Keyboard shortcuts work
- [ ] Mobile layout is usable
- [ ] Error messages are helpful
- [ ] Performance is acceptable with long sessions

---

## Maintenance Plan

### Documentation
- Update README with new features
- Add component documentation
- Create user guide for commands
- Document event streaming architecture

### Future Enhancements
- Add search/filter for messages
- Implement message threading
- Add file editing in UI
- Support for custom themes
- Plugin system for custom components
- Multiple project workspaces
- Collaborative sessions

---

## Questions & Decisions

### Open Questions
1. Should reasoning blocks be collapsed by default?
   - **Decision:** Yes, to reduce clutter
2. Should we implement message editing?
   - **Decision:** Defer to future (not in OpenCode API)
3. How to handle very large tool outputs?
   - **Decision:** Truncate with "Show more" button
4. Should we support dark/light mode switching?
   - **Decision:** Yes, use existing theme system

### Architecture Decisions
1. **State Management:** Continue with React useState/useContext
   - Consider Zustand if state complexity grows
2. **Styling:** Continue with Tailwind + webtui
3. **Type Safety:** Use OpenCode SDK types from npm package
4. **Error Handling:** Centralized error message formatting

---

## Conclusion

This enhancement plan provides a comprehensive roadmap to transform opencode-web from a basic chat interface into a professional, feature-rich development assistant with:

1. **Rich Message Display** - Full visibility into AI reasoning and tool execution
2. **Professional File Viewer** - Syntax highlighting, images, and diffs
3. **Complete Feature Set** - All OpenCode commands implemented
4. **Real-time Updates** - Live progress without page refresh
5. **Polished UX** - Keyboard shortcuts, loading states, error handling

**Total Estimated Effort:** 2-3 weeks  
**Priority Phases:** 1 → 2 → 3 → 4 → 5  
**Complexity:** Medium-High  
**Risk Level:** Medium

---

**Last Updated:** 2025-01-30  
**Document Version:** 1.0  
**Status:** Ready for Implementation ✅