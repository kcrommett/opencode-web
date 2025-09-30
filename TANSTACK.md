# TanStack Start Migration Plan

## Executive Summary

Migrate from using the OpenCode SDK directly to calling the OpenCode HTTP API through TanStack Start server functions. This approach:
- Eliminates non-serializable SDK response objects (Request/Response)
- Properly proxies OpenCode API calls from server to client
- Works with WAF restrictions (OpenCode API not publicly accessible)
- Follows TanStack Start's server function architecture

---

## Current Architecture Problems

### Issue 1: SDK Response Objects Are Not Serializable
```typescript
// ❌ BROKEN: OpenCode SDK returns Request/Response objects
const response = await client.session.list();
// response contains non-serializable objects
```

### Issue 2: 'use server' Directive Not Supported
```typescript
// ❌ Next.js pattern - doesn't work in TanStack Start
'use server'
export async function getSessions() { ... }
```

### Issue 3: Client Calling Server Functions Directly
```typescript
// ❌ BROKEN: Client trying to call server-only code
useOpenCode hook → opencode-client.ts → opencode-api.ts (server)
```

---

## OpenCode HTTP API Overview

Based on https://opencode.ai/docs/server/, the OpenCode server exposes REST endpoints:

### Key Endpoints We're Using:

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `GET` | `/app/agents` | List all agents | `Agent[]` |
| `GET` | `/config/providers` | List providers & models | `{ providers: Provider[], default: {...} }` |
| `GET` | `/session` | List sessions | `Session[]` |
| `GET` | `/session/:id` | Get session details | `Session` |
| `GET` | `/session/:id/message` | Get messages | `Message[]` with parts |
| `POST` | `/session` | Create session | `Session` |
| `POST` | `/session/:id/message` | Send chat message | `Message` |
| `DELETE` | `/session/:id` | Delete session | - |
| `GET` | `/file?path=<path>` | Read file | `{ type, content }` |
| `GET` | `/find/file?query=<q>` | Find files | `string[]` |
| `GET` | `/project` | List projects | `Project[]` |
| `GET` | `/project/current` | Get current project | `Project` |

### Query Parameters:
- `directory` - Optional directory context for project/session operations
- `path` - File path for file operations
- `query` - Search query for find operations

---

## Solution Architecture

### TanStack Start Server Functions Pattern

```typescript
// ✅ CORRECT PATTERN
import { createServerFn } from '@tanstack/react-start'

export const getSessions = createServerFn({ method: 'GET' })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    const url = new URL('/session', OPENCODE_SERVER_URL)
    if (data.directory) {
      url.searchParams.set('directory', data.directory)
    }
    
    const response = await fetch(url.toString())
    const sessions = await response.json()
    return sessions // Auto-serialized by TanStack
  })

// Usage in client
const sessions = await getSessions({ data: { directory: '~/project' } })
```

---

## Migration Strategy

### Phase 1: Create HTTP API Layer ✅ TO DO
**File:** `src/lib/opencode-http-api.ts`

Replace SDK calls with direct HTTP fetch to OpenCode server:

```typescript
const OPENCODE_SERVER_URL = process.env.OPENCODE_SERVER_URL || 'http://localhost:4096'

// Helper to build URLs with query params
function buildUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(path, OPENCODE_SERVER_URL)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, value)
    })
  }
  return url.toString()
}

// GET /app/agents
export async function getAgents() {
  const response = await fetch(buildUrl('/app/agents'))
  return response.json()
}

// GET /session?directory=<dir>
export async function getSessions(directory?: string) {
  const url = buildUrl('/session', directory ? { directory } : undefined)
  const response = await fetch(url)
  return response.json()
}

// POST /session with body
export async function createSession(body: { title?: string }, directory?: string) {
  const url = buildUrl('/session', directory ? { directory } : undefined)
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return response.json()
}

// GET /file?path=<path>&directory=<dir>
export async function readFile(filePath: string, directory?: string) {
  const params: Record<string, string> = { path: filePath }
  if (directory) params.directory = directory
  const response = await fetch(buildUrl('/file', params))
  return response.json()
}
```

### Phase 2: Create TanStack Server Functions ✅ TO DO
**File:** `src/lib/opencode-server-fns.ts`

Wrap HTTP API calls in `createServerFn`:

```typescript
import { createServerFn } from '@tanstack/react-start'
import * as httpApi from './opencode-http-api'

// GET functions
export const getAgents = createServerFn({ method: 'GET' })
  .handler(async () => {
    return httpApi.getAgents()
  })

export const getSessions = createServerFn({ method: 'GET' })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.getSessions(data.directory)
  })

export const getMessages = createServerFn({ method: 'GET' })
  .inputValidator((data: { sessionId: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.getMessages(data.sessionId)
  })

export const listProjects = createServerFn({ method: 'GET' })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.listProjects(data.directory)
  })

export const getProviders = createServerFn({ method: 'GET' })
  .handler(async () => {
    return httpApi.getProviders()
  })

export const findFiles = createServerFn({ method: 'GET' })
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.findFiles(data.query)
  })

export const listFiles = createServerFn({ method: 'GET' })
  .inputValidator((data: { path: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.listFiles(data.path, data.directory)
  })

export const readFile = createServerFn({ method: 'GET' })
  .inputValidator((data: { filePath: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.readFile(data.filePath, data.directory)
  })

// POST functions
export const createSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { title?: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.createSession(
      { title: data.title },
      data.directory
    )
  })

export const sendMessage = createServerFn({ method: 'POST' })
  .inputValidator((data: { 
    sessionId: string
    content: string
    providerID?: string
    modelID?: string
  }) => data)
  .handler(async ({ data }) => {
    return httpApi.sendMessage(
      data.sessionId,
      data.content,
      data.providerID,
      data.modelID
    )
  })

export const deleteSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.deleteSession(data.sessionId)
  })
```

### Phase 3: Update Client Layer ✅ TO DO
**File:** `src/lib/opencode-client.ts`

Update to call server functions with proper format:

```typescript
import * as serverFns from './opencode-server-fns'

export const openCodeService = {
  async getAgents() {
    try {
      const response = await serverFns.getAgents()
      return { data: response, error: null }
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) }
    }
  },

  async getSessions(directory?: string) {
    try {
      const response = await serverFns.getSessions({ 
        data: { directory } 
      })
      return { data: response }
    } catch (error) {
      console.error('Error in getSessions:', error)
      return { data: [] }
    }
  },

  async createSession({ title, directory }: { title?: string; directory?: string } = {}) {
    try {
      const response = await serverFns.createSession({ 
        data: { title, directory } 
      })
      return { data: response, error: null }
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) }
    }
  },

  async sendMessage(sessionId: string, content: string, providerID?: string, modelID?: string) {
    try {
      const response = await serverFns.sendMessage({ 
        data: { sessionId, content, providerID, modelID } 
      })
      return { data: response, error: null }
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) }
    }
  },

  async findFiles(query: string) {
    try {
      const response = await serverFns.findFiles({ 
        data: { query } 
      })
      return { data: response }
    } catch (error) {
      throw error
    }
  },

  async readFile(filePath: string, directory?: string) {
    try {
      const response = await serverFns.readFile({ 
        data: { filePath, directory } 
      })
      return { data: response }
    } catch (error) {
      throw error
    }
  }

  // ... continue for all other methods
}
```

### Phase 4: Update Hook (No Changes Needed) ✅
**File:** `src/hooks/useOpenCode.ts`

The hook should continue to work as-is since it calls `openCodeService`, which now properly proxies through server functions.

### Phase 5: Cleanup ✅ TO DO
1. Delete `src/lib/opencode-api.ts` (old SDK-based file)
2. Delete `src/lib/opencode-rpc.ts` (incomplete attempt)
3. Remove `@opencode-ai/sdk` from dependencies if not needed elsewhere

---

## Complete API Mapping

### Endpoints to Implement

| Operation | HTTP Method | Path | Input | TanStack Fn |
|-----------|-------------|------|-------|-------------|
| **App** |
| getAgents | GET | `/app/agents` | - | `getAgents()` |
| **Config** |
| getProviders | GET | `/config/providers` | - | `getProviders()` |
| **Sessions** |
| getSessions | GET | `/session?directory=<dir>` | `{ directory? }` | `getSessions({ data })` |
| getSession | GET | `/session/:id` | `{ sessionId }` | `getSession({ data })` |
| createSession | POST | `/session?directory=<dir>` | `{ title?, directory? }` | `createSession({ data })` |
| deleteSession | DELETE | `/session/:id` | `{ sessionId }` | `deleteSession({ data })` |
| getMessages | GET | `/session/:id/message` | `{ sessionId }` | `getMessages({ data })` |
| sendMessage | POST | `/session/:id/message` | `{ sessionId, content, providerID?, modelID? }` | `sendMessage({ data })` |
| **Files** |
| findFiles | GET | `/find/file?query=<q>` | `{ query }` | `findFiles({ data })` |
| listFiles | GET | `/file?path=<p>&directory=<d>` | `{ path, directory? }` | `listFiles({ data })` |
| readFile | GET | `/file?path=<p>&directory=<d>` | `{ filePath, directory? }` | `readFile({ data })` |
| **Projects** |
| listProjects | GET | `/project?directory=<dir>` | `{ directory? }` | `listProjects({ data })` |
| getCurrentProject | GET | `/project/current?directory=<dir>` | `{ directory? }` | `getCurrentProject({ data })` |

### Response Format Notes

All responses from OpenCode API are already JSON. No need to parse SDK response wrappers.

**Session response:**
```json
{
  "id": "abc123",
  "title": "My Session",
  "directory": "/path/to/project",
  "projectID": "proj-xyz",
  "time": {
    "created": 1234567890,
    "updated": 1234567890
  }
}
```

**Messages response:**
```json
[
  {
    "info": {
      "id": "msg-1",
      "role": "user",
      "time": { "created": 1234567890 }
    },
    "parts": [
      { "type": "text", "text": "Hello" }
    ]
  }
]
```

---

## Environment Variables

Ensure `OPENCODE_SERVER_URL` is set:

```bash
# .env.local (development)
OPENCODE_SERVER_URL=http://localhost:4096

# Production
OPENCODE_SERVER_URL=http://internal-opencode-server:4096
```

---

## Testing Strategy

### 1. Unit Test HTTP API Layer
```typescript
// Test buildUrl helper
expect(buildUrl('/session', { directory: '/test' }))
  .toBe('http://localhost:4096/session?directory=%2Ftest')

// Test fetch calls (mock fetch)
global.fetch = jest.fn(() => 
  Promise.resolve({
    json: () => Promise.resolve([{ id: 'test-session' }])
  })
)
const sessions = await getSessions('/test')
expect(fetch).toHaveBeenCalledWith(
  'http://localhost:4096/session?directory=%2Ftest'
)
```

### 2. Integration Test Server Functions
```typescript
// Call server function from test
const result = await serverFns.getSessions({ data: { directory: '/test' } })
expect(result).toEqual([{ id: 'test-session' }])
```

### 3. E2E Test Full Flow
1. Load sessions list
2. Create new session
3. Send message
4. Verify message appears
5. Delete session

---

## Rollout Checklist

- [x] **Phase 1:** Create `opencode-http-api.ts` with all fetch calls
- [x] **Phase 2:** Create `opencode-server-fns.ts` with all `createServerFn` wrappers
- [x] **Phase 3:** Update `opencode-client.ts` to call server functions
- [x] **Phase 4:** Verify `useOpenCode.ts` still works (no changes needed)
- [x] **Phase 5:** Delete old SDK files (`opencode-api.ts`, `opencode-rpc.ts`)
- [x] **Phase 6:** Remove SDK dependency from `package.json`
- [x] **Test:** Run build (`bun run build`) - ✅ PASSED
- [ ] **Test:** Run dev server (`bun run dev`)
- [ ] **Test:** Verify all operations work end-to-end
- [ ] **Deploy:** Update production environment variables

---

## Troubleshooting

### Error: "Invariant failed: expected content-type header"
- **Cause:** Trying to call SDK function from client
- **Fix:** Ensure using server functions, not direct SDK calls

### Error: "fetch is not defined"
- **Cause:** Running server code in browser
- **Fix:** Verify `createServerFn().handler()` wraps the fetch call

### Error: "Cannot read property 'data' of undefined"
- **Cause:** Server function returning wrong format
- **Fix:** Return raw JSON from handler, not wrapped in `{ data }` - TanStack handles serialization

### Sessions not loading
- **Check:** `OPENCODE_SERVER_URL` is set correctly
- **Check:** OpenCode server is running on that URL
- **Check:** Network tab shows server function calls succeeding

---

## Benefits of This Approach

✅ **No SDK dependencies** - Direct HTTP calls, easy to debug
✅ **Serializable responses** - All JSON, no Request/Response objects
✅ **WAF compatible** - Server proxies requests, OpenCode API stays internal
✅ **Type-safe** - TanStack `inputValidator` ensures correct params
✅ **Follows framework patterns** - Uses `createServerFn` as intended
✅ **Easy to extend** - Add new endpoints by copying existing pattern

---

## Progress Tracking

### ✅ Completed
- [x] Research TanStack Start server functions
- [x] Review OpenCode API documentation
- [x] Design migration architecture
- [x] Document migration plan
- [x] Phase 1: HTTP API Layer - Created `opencode-http-api.ts` with all endpoints
- [x] Phase 2: Server Functions - Created `opencode-server-fns.ts` with TanStack wrappers
- [x] Phase 3: Client Updates - Updated `opencode-client.ts` to use server functions
- [x] Phase 5: Cleanup - Deleted old SDK files and removed SDK dependency

### 🚧 In Progress
- [ ] Phase 4: Testing - Need to verify endpoints work end-to-end

### 📝 Next Actions
1. Start OpenCode server (`opencode serve`)
2. Start dev server (`bun run dev`)
3. Test critical operations:
   - Load sessions list
   - Create new session
   - Send message
   - View messages
   - Get providers/agents
4. Verify no errors in browser console
5. Mark migration complete if all tests pass

---

## Reference Links

- [TanStack Start Docs - Server Functions](https://tanstack.com/start/latest/docs/framework/react/server-functions)
- [OpenCode Server API Docs](https://opencode.ai/docs/server/)
- [TanStack Start Examples](https://tanstack.com/start/latest/docs/framework/react/examples/start-basic)