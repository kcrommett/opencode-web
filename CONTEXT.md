# Context Documentation

This file contains reference documentation for the OpenCode HTTP Server API and TanStack Start server functions.

---

## OpenCode HTTP Server API

### Overview

The `opencode serve` command runs a headless HTTP server that exposes an OpenAPI endpoint.

#### Usage
```bash
opencode serve [--port <number>] [--hostname <string>]
```

**Options:**
- `--port` / `-p`: Port to listen on (default: `4096`)
- `--hostname` / `-h`: Hostname to listen on (default: `127.0.0.1`)

#### Spec
OpenAPI 3.1 spec available at: `http://<hostname>:<port>/doc`

---

### API Endpoints

#### App

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `GET` | `/app` | Get app info | [`App`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) |
| `POST` | `/app/init` | Initialize the app | `boolean` |

#### Config

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `GET` | `/config` | Get config info | [`Config`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) |
| `GET` | `/config/providers` | List providers and default models | `{ providers: Provider[], default: { [key: string]: string } }` |

#### Sessions

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| `GET` | `/session` | List sessions | Returns [`Session[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) |
| `GET` | `/session/:id` | Get session | Returns [`Session`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) |
| `GET` | `/session/:id/children` | List child sessions | Returns [`Session[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) |
| `POST` | `/session` | Create session | body: `{ parentID?, title? }`, returns [`Session`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) |
| `DELETE` | `/session/:id` | Delete session | |
| `PATCH` | `/session/:id` | Update session properties | body: `{ title? }`, returns [`Session`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) |
| `POST` | `/session/:id/init` | Analyze app and create `AGENTS.md` | body: `{ messageID, providerID, modelID }` |
| `POST` | `/session/:id/abort` | Abort a running session | |
| `POST` | `/session/:id/share` | Share session | Returns [`Session`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) |
| `DELETE` | `/session/:id/share` | Unshare session | Returns [`Session`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) |
| `POST` | `/session/:id/summarize` | Summarize session | |
| `GET` | `/session/:id/message` | List messages in a session | Returns `{ info: Message, parts: Part[] }[]` |
| `GET` | `/session/:id/message/:messageID` | Get message details | Returns `{ info: Message, parts: Part[] }` |
| `POST` | `/session/:id/message` | Send chat message | body matches [`ChatInput`](https://github.com/sst/opencode/blob/main/packages/opencode/src/session/index.ts#L358), returns [`Message`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) |
| `POST` | `/session/:id/shell` | Run a shell command | body matches [`CommandInput`](https://github.com/sst/opencode/blob/main/packages/opencode/src/session/index.ts#L1007), returns [`Message`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) |
| `POST` | `/session/:id/revert` | Revert a message | body: `{ messageID }` |
| `POST` | `/session/:id/unrevert` | Restore reverted messages | |
| `POST` | `/session/:id/permissions/:permissionID` | Respond to a permission request | body: `{ response }` |

#### Files

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `GET` | `/find?pattern=<pat>` | Search for text in files | Array of match objects with `path`, `lines`, `line_number`, `absolute_offset`, `submatches` |
| `GET` | `/find/file?query=<q>` | Find files by name | `string[]` (file paths) |
| `GET` | `/find/symbol?query=<q>` | Find workspace symbols | [`Symbol[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) |
| `GET` | `/file?path=<path>` | Read a file | `{ type: "raw" \| "patch", content: string }` |
| `GET` | `/file/status` | Get status for tracked files | [`File[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) |

#### Logging

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `POST` | `/log` | Write log entry. Body: `{ service, level, message, extra? }` | `boolean` |

#### Agents

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `GET` | `/agent` | List all available agents | [`Agent[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) |

#### TUI

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `POST` | `/tui/append-prompt` | Append text to the prompt | `boolean` |
| `POST` | `/tui/open-help` | Open the help dialog | `boolean` |
| `POST` | `/tui/open-sessions` | Open the session selector | `boolean` |
| `POST` | `/tui/open-themes` | Open the theme selector | `boolean` |
| `POST` | `/tui/open-models` | Open the model selector | `boolean` |
| `POST` | `/tui/submit-prompt` | Submit the current prompt | `boolean` |
| `POST` | `/tui/clear-prompt` | Clear the prompt | `boolean` |
| `POST` | `/tui/execute-command` | Execute a command (`{ command }`) | `boolean` |
| `POST` | `/tui/show-toast` | Show toast (`{ title?, message, variant }`) | `boolean` |
| `GET` | `/tui/control/next` | Wait for the next control request | Control request object |
| `POST` | `/tui/control/response` | Respond to a control request (`{ body }`) | `boolean` |

#### Auth

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `PUT` | `/auth/:id` | Set authentication credentials. Body must match provider schema | `boolean` |

#### Events

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `GET` | `/event` | Server-sent events stream. First event is `server.connected`, then bus events | Server-sent events stream |

#### Docs

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `GET` | `/doc` | OpenAPI 3.1 specification | HTML page with OpenAPI spec |

---

## TanStack Start Server Functions

### Overview

TanStack Start provides `createServerFn()` for defining server-only functions that can be called from the client via RPC.

### Basic Usage

#### Simple Server Function
```tsx
import { createServerFn } from '@tanstack/react-start'

export const getServerTime = createServerFn().handler(async () => {
  return new Date().toISOString()
})

// Call from anywhere
const time = await getServerTime()
```

#### HTTP Methods
```tsx
// GET request (default)
export const getData = createServerFn().handler(async () => {
  return { message: 'Hello from server!' }
})

// POST request
export const saveData = createServerFn({ method: 'POST' }).handler(async () => {
  return { success: true }
})
```

### Input Validation

#### Basic Validation
```tsx
export const greetUser = createServerFn({ method: 'GET' })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    return `Hello, ${data.name}!`
  })

await greetUser({ data: { name: 'John' } })
```

#### Zod Validation
```tsx
import { z } from 'zod'

const UserSchema = z.object({
  name: z.string().min(1),
  age: z.number().min(0),
})

export const createUser = createServerFn({ method: 'POST' })
  .inputValidator((data) => UserSchema.parse(data))
  .handler(async ({ data }) => {
    return `Created user: ${data.name}, age ${data.age}`
  })
```

#### FormData Validation
```tsx
export const submitForm = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData')
    }
    return {
      name: data.get('name')?.toString() || '',
      email: data.get('email')?.toString() || '',
    }
  })
  .handler(async ({ data }) => {
    return { success: true }
  })
```

### Error Handling

#### Throwing Errors
```tsx
export const riskyFunction = createServerFn().handler(async () => {
  if (Math.random() > 0.5) {
    throw new Error('Something went wrong!')
  }
  return { success: true }
})

// Errors are serialized to the client
try {
  await riskyFunction()
} catch (error) {
  console.log(error.message)
}
```

#### Not Found Errors
```tsx
import { notFound } from '@tanstack/react-router'

export const getPost = createServerFn()
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const post = await db.findPost(data.id)
    if (!post) {
      throw notFound()
    }
    return post
  })
```

#### Redirects
```tsx
import { redirect } from '@tanstack/react-router'

export const requireAuth = createServerFn().handler(async () => {
  const user = await getCurrentUser()
  if (!user) {
    throw redirect({ to: '/login' })
  }
  return user
})
```

### Middleware

#### Function-Level Middleware
```tsx
import { createMiddleware } from '@tanstack/react-start'

const loggingMiddleware = createMiddleware({ type: 'function' })
  .client(() => {
    // Client-side logic
  })
  .server(() => {
    // Server-side logic
  })

const fn = createServerFn()
  .middleware([loggingMiddleware])
  .handler(async () => {
    // Handler logic
  })
```

#### Global Middleware
```tsx
// src/start.ts
import { createStart } from '@tanstack/react-start'
import { loggingMiddleware } from './middleware'

export const startInstance = createStart(() => {
  return {
    functionMiddleware: [loggingMiddleware],
  }
})
```

### Database Integration

```tsx
import { createServerFn } from '@tanstack/react-start'

const db = createMyDatabaseClient()

export const getUser = createServerFn(async ({ ctx }) => {
  const user = await db.getUser(ctx.userId)
  return user
})

export const createUser = createServerFn(async ({ ctx, input }) => {
  const user = await db.createUser(input)
  return user
})
```

### External API Integration

```tsx
import { createServerFn } from '@tanstack/react-start'

// Server-side API calls (can use secret keys)
const fetchUserData = createServerFn()
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const response = await fetch(
      `${process.env.EXTERNAL_API_URL}/users/${data.userId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.EXTERNAL_API_SECRET}`,
          'Content-Type': 'application/json'
        }
      }
    )
    return response.json()
  })
```

### Authentication Example

```tsx
import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'

// Login server function
export const loginFn = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const user = await authenticateUser(data.email, data.password)
    if (!user) {
      return { error: 'Invalid credentials' }
    }
    const session = await useAppSession()
    await session.update({
      userId: user.id,
      email: user.email,
    })
    throw redirect({ to: '/dashboard' })
  })

// Logout server function
export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useAppSession()
  await session.clear()
  throw redirect({ to: '/' })
})

// Get current user
export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await useAppSession()
    const userId = session.get('userId')
    if (!userId) {
      return null
    }
    return await getUserById(userId)
  },
)
```

### Other Function Types

#### createServerOnlyFn
Crashes if called from client (for server-only utilities):
```tsx
import { createServerOnlyFn } from '@tanstack/react-start'

const getSecret = createServerOnlyFn(() => process.env.SECRET)
```

#### createIsomorphicFn
Different implementations per environment:
```tsx
import { createIsomorphicFn } from '@tanstack/react-start'

const getEnv = createIsomorphicFn()
  .server(() => 'server')
  .client(() => 'client')

const env = getEnv()
```

#### createClientOnlyFn
Crashes if called from server (for client-only utilities):
```tsx
import { createClientOnlyFn } from '@tanstack/react-start'

const saveToStorage = createClientOnlyFn((data: any) => {
  localStorage.setItem('data', JSON.stringify(data))
})
```

### Usage in Components and Loaders

```tsx
// In a route loader
export const Route = createFileRoute('/posts')({
  loader: () => getPosts(),
})

// In a component
function PostList() {
  const getPosts = useServerFn(getServerPosts)
  const { data } = useQuery({
    queryKey: ['posts'],
    queryFn: () => getPosts(),
  })
}
```

---

## Key Patterns for OpenCode Web

### Server Function Call Pattern
```tsx
// Define server function
export const getSessions = createServerFn({ method: 'GET' })
  .inputValidator((data: { directory?: string }) => data)
  .handler(async ({ data }) => {
    const url = new URL(`${OPENCODE_SERVER_URL}/session`)
    if (data.directory) {
      url.searchParams.set('directory', data.directory)
    }
    const response = await fetch(url.toString())
    return response.json()
  })

// Call from client
const sessions = await getSessions({ data: { directory: '/path/to/project' } })
```

### Query Parameters Pattern
```tsx
function buildURL(baseURL: string, params?: Record<string, string>): string {
  const url = new URL(baseURL)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, value)
      }
    })
  }
  return url.toString()
}
```

### POST Request Pattern
```tsx
export const sendMessage = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string; message: string }) => data)
  .handler(async ({ data }) => {
    const response = await fetch(
      `${OPENCODE_SERVER_URL}/session/${data.sessionId}/message`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: data.message })
      }
    )
    return response.json()
  })
```