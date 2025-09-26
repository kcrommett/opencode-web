# OpenCode SDK Integration Guide

## Overview

OpenCode operates with a client-server model where you run an OpenCode server on your development machine and connect to it via HTTP requests using the JavaScript SDK. This enables you to create web interfaces that interact with OpenCode from any device, including mobile phones.

## Architecture

```
[Your Computer] ──── OpenCode Server (localhost:4096)
                            │
                            │ HTTP API
                            │
[Phone/Browser] ──── Next.js Web App ──── SDK Client
```

## Setup Steps

### 1. Start OpenCode Server

On your development machine, start the OpenCode server:

```bash
# Allow external connections (not just localhost)
opencode serve --hostname=0.0.0.0 --port=4096

# Server will output:
# opencode server listening on http://0.0.0.0:4096
```

**Important**: Using `0.0.0.0` allows connections from other devices on your network.

### 2. Install SDK in Next.js Project

```bash
npm install @opencode-ai/sdk
# or
yarn add @opencode-ai/sdk
# or
pnpm add @opencode-ai/sdk
```

### 3. Configure Next.js Client

Create a client configuration file:

```typescript
// lib/opencode.ts
import { createOpencodeClient } from "@opencode-ai/sdk"

// Replace with your computer's local IP address
const OPENCODE_SERVER_URL = process.env.NEXT_PUBLIC_OPENCODE_URL || "http://192.168.1.100:4096"

export const opencodeClient = createOpencodeClient({
  baseUrl: OPENCODE_SERVER_URL,
})
```

### 4. Environment Variables

Add to your `.env.local`:

```bash
# Replace with your actual computer's IP address on the local network
NEXT_PUBLIC_OPENCODE_URL=http://192.168.1.100:4096
```

**Find your IP address:**

- **macOS/Linux**: `ifconfig | grep inet`
- **Windows**: `ipconfig`
- Look for your local network IP (usually 192.168.x.x or 10.x.x.x)

## Core SDK Usage

### Session Management

```typescript
// Create a new session
const createSession = async (name: string) => {
  const response = await opencodeClient.session.create({
    body: { name },
  })
  return response.data
}

// List all sessions
const getSessions = async () => {
  const response = await opencodeClient.session.list()
  return response.data
}

// Get session details
const getSession = async (sessionId: string) => {
  const response = await opencodeClient.session.get({
    path: { id: sessionId },
  })
  return response.data
}
```

### Sending Messages

```typescript
// Send a chat message
const sendMessage = async (sessionId: string, content: string) => {
  const response = await opencodeClient.session.chat({
    path: { id: sessionId },
    body: {
      content,
      type: "user" as const,
    },
  })
  return response.data
}

// Get session messages
const getMessages = async (sessionId: string) => {
  const response = await opencodeClient.session.messages({
    path: { id: sessionId },
  })
  return response.data
}
```

### Real-time Events

```typescript
// Subscribe to real-time events
const subscribeToEvents = (onEvent: (event: any) => void) => {
  const eventSource = opencodeClient.event.subscribe()

  eventSource.addEventListener("message", (event) => {
    const data = JSON.parse(event.data)
    onEvent(data)
  })

  // Return cleanup function
  return () => eventSource.close()
}
```

### File Operations

```typescript
// Read a file
const readFile = async (filePath: string) => {
  const response = await opencodeClient.file.read({
    query: { path: filePath },
  })
  return response.data
}

// Search for files
const searchFiles = async (query: string) => {
  const response = await opencodeClient.find.files({
    query: { q: query },
  })
  return response.data
}

// Search text in files
const searchText = async (query: string) => {
  const response = await opencodeClient.find.text({
    query: { q: query },
  })
  return response.data
}
```

## Next.js Implementation Example

### API Route Handler

```typescript
// app/api/opencode/route.ts
import { opencodeClient } from "@/lib/opencode"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { action, sessionId, content } = await request.json()

    switch (action) {
      case "create_session":
        const session = await opencodeClient.session.create({
          body: { name: content || "New Session" },
        })
        return NextResponse.json(session.data)

      case "send_message":
        const response = await opencodeClient.session.chat({
          path: { id: sessionId },
          body: { content, type: "user" },
        })
        return NextResponse.json(response.data)

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("OpenCode API error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
```

### React Hook

```typescript
// hooks/useOpenCode.ts
import { useState, useEffect } from "react"

export const useOpenCode = () => {
  const [sessions, setSessions] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  const createSession = async (name: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/opencode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_session", content: name }),
      })
      const session = await response.json()
      setSessions((prev) => [...prev, session])
      setCurrentSession(session)
      return session
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (content: string) => {
    if (!currentSession) return

    setLoading(true)
    try {
      const response = await fetch("/api/opencode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_message",
          sessionId: currentSession.id,
          content,
        }),
      })
      const message = await response.json()
      setMessages((prev) => [...prev, message])
      return message
    } finally {
      setLoading(false)
    }
  }

  return {
    sessions,
    currentSession,
    messages,
    loading,
    createSession,
    sendMessage,
    setCurrentSession,
  }
}
```

### React Component

```typescript
// components/OpenCodeChat.tsx
'use client'

import { useState } from 'react'
import { useOpenCode } from '@/hooks/useOpenCode'

export default function OpenCodeChat() {
  const [input, setInput] = useState('')
  const {
    currentSession,
    messages,
    loading,
    createSession,
    sendMessage
  } = useOpenCode()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    if (!currentSession) {
      await createSession('Mobile Session')
    }

    await sendMessage(input)
    setInput('')
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-lg font-semibold">
          {currentSession ? currentSession.name : 'OpenCode'}
        </h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg max-w-xs ${
              message.type === 'user'
                ? 'bg-blue-100 ml-auto'
                : 'bg-gray-100'
            }`}
          >
            {message.content}
          </div>
        ))}
        {loading && (
          <div className="bg-gray-100 p-3 rounded-lg max-w-xs">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
```

## Network Configuration

### Firewall Settings

Ensure your firewall allows connections on port 4096:

**macOS:**

```bash
sudo pfctl -f /etc/pf.conf
```

**Windows:**
Allow Node.js through Windows Firewall when prompted.

**Linux:**

```bash
sudo ufw allow 4096
```

### Mobile Testing

1. Ensure your phone is on the same WiFi network
2. Find your computer's local IP address
3. Access your Next.js app via `http://YOUR_COMPUTER_IP:3000`

## Production Considerations

### Security

- **Never expose OpenCode server to the internet directly**
- Use authentication in your Next.js app
- Consider VPN for remote access
- Implement rate limiting

### Error Handling

```typescript
// utils/opencode-error-handler.ts
export const handleOpencodeError = (error: any) => {
  if (error.response?.status === 404) {
    return "OpenCode server not found. Is it running?"
  }
  if (error.code === "ECONNREFUSED") {
    return "Cannot connect to OpenCode server"
  }
  return "An unexpected error occurred"
}
```

### Connection Testing

```typescript
// utils/test-connection.ts
import { opencodeClient } from "@/lib/opencode"

export const testConnection = async (): Promise<boolean> => {
  try {
    await opencodeClient.app.get()
    return true
  } catch (error) {
    console.error("OpenCode connection test failed:", error)
    return false
  }
}
```

## Troubleshooting

### Common Issues

1. **Connection refused**: Check OpenCode server is running with correct hostname
2. **CORS errors**: Make sure you're using the API routes, not direct client calls
3. **Network timeout**: Verify firewall settings and network connectivity
4. **Authentication errors**: Ensure OpenCode server has proper provider configuration

### Debug Steps

1. Test OpenCode server: `curl http://YOUR_IP:4096/app`
2. Check Next.js logs: `npm run dev`
3. Verify environment variables are set correctly
4. Test connection from same network device

## Advanced Features

### Server-Sent Events (SSE)

For real-time updates without polling:

```typescript
// hooks/useOpencodeEvents.ts
import { useEffect, useState } from "react"
import { opencodeClient } from "@/lib/opencode"

export const useOpencodeEvents = () => {
  const [events, setEvents] = useState([])

  useEffect(() => {
    const eventSource = opencodeClient.event.subscribe()

    eventSource.addEventListener("message", (event) => {
      const data = JSON.parse(event.data)
      setEvents((prev) => [...prev, data])
    })

    return () => eventSource.close()
  }, [])

  return events
}
```

This setup gives you a fully functional OpenCode web interface that can be accessed from any device on your network, including mobile phones.
