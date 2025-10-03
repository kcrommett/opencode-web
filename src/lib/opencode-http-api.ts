const OPENCODE_SERVER_URL =
  import.meta.env.VITE_OPENCODE_SERVER_URL || 'http://localhost:4096'

function buildUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(path, OPENCODE_SERVER_URL)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, value)
      }
    })
  }
  return url.toString()
}

export async function getAgents() {
  const response = await fetch(buildUrl('/agent'))
  if (!response.ok) {
    throw new Error(`Failed to get agents: ${response.statusText}`)
  }
  return response.json()
}

export async function getProviders() {
  const response = await fetch(buildUrl('/config/providers'))
  if (!response.ok) {
    throw new Error(`Failed to get providers: ${response.statusText}`)
  }
  return response.json()
}

export async function getSessions(directory?: string) {
  const url = buildUrl('/session', directory ? { directory } : undefined)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to get sessions: ${response.statusText}`)
  }
  return response.json()
}

export async function getSession(sessionId: string, directory?: string) {
  const response = await fetch(
    buildUrl(`/session/${sessionId}`, directory ? { directory } : undefined)
  )
  if (!response.ok) {
    throw new Error(`Failed to get session: ${response.statusText}`)
  }
  return response.json()
}

export async function createSession(
  body: { title?: string; parentID?: string },
  directory?: string,
) {
  const url = buildUrl('/session', directory ? { directory } : undefined)
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`)
  }
  return response.json()
}

export async function deleteSession(sessionId: string, directory?: string) {
  const response = await fetch(
    buildUrl(`/session/${sessionId}`, directory ? { directory } : undefined),
    {
      method: 'DELETE',
    }
  )
  if (!response.ok) {
    throw new Error(`Failed to delete session: ${response.statusText}`)
  }
  return response.ok
}

export async function updateSession(
  sessionId: string,
  updates: { title?: string },
  directory?: string,
) {
  const response = await fetch(
    buildUrl(`/session/${sessionId}`, directory ? { directory } : undefined),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }
  )
  if (!response.ok) {
    throw new Error(`Failed to update session: ${response.statusText}`)
  }
  return response.json()
}

export async function getMessages(sessionId: string, directory?: string) {
  const response = await fetch(
    buildUrl(`/session/${sessionId}/message`, directory ? { directory } : undefined)
  )
  if (!response.ok) {
    throw new Error(`Failed to get messages: ${response.statusText}`)
  }
  return response.json()
}

export async function getMessage(sessionId: string, messageId: string, directory?: string) {
  const response = await fetch(
    buildUrl(`/session/${sessionId}/message/${messageId}`, directory ? { directory } : undefined)
  )
  if (!response.ok) {
    throw new Error(`Failed to get message: ${response.statusText}`)
  }
  return response.json()
}

export async function sendMessage(
  sessionId: string,
  content: string,
  providerID?: string,
  modelID?: string,
  directory?: string,
) {
  const body: Record<string, unknown> = {
    parts: [
      {
        type: 'text',
        text: content,
      },
    ],
  }
  if (providerID && modelID) {
    body.model = { providerID, modelID }
  }

  const url = buildUrl(
    `/session/${sessionId}/message`,
    directory ? { directory } : undefined
  )

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = response.statusText
    
    try {
      const errorJson = JSON.parse(errorText)
      if (errorJson.data?.message) {
        errorMessage = errorJson.data.message
      }
    } catch {
      errorMessage = errorText || response.statusText
    }
    
    throw new Error(errorMessage)
  }
  return response.json()
}

export async function abortSession(sessionId: string, directory?: string) {
  const response = await fetch(
    buildUrl(`/session/${sessionId}/abort`, directory ? { directory } : undefined),
    {
      method: 'POST',
    }
  )
  if (!response.ok) {
    throw new Error(`Failed to abort session: ${response.statusText}`)
  }
  return response.ok
}

export async function shareSession(sessionId: string, directory?: string) {
  const response = await fetch(
    buildUrl(`/session/${sessionId}/share`, directory ? { directory } : undefined),
    {
      method: 'POST',
    }
  )
  if (!response.ok) {
    throw new Error(`Failed to share session: ${response.statusText}`)
  }
  return response.json()
}

export async function unshareSession(sessionId: string, directory?: string) {
  const response = await fetch(
    buildUrl(`/session/${sessionId}/share`, directory ? { directory } : undefined),
    {
      method: 'DELETE',
    }
  )
  if (!response.ok) {
    throw new Error(`Failed to unshare session: ${response.statusText}`)
  }
  return response.json()
}

export async function revertMessage(sessionId: string, messageID: string, directory?: string) {
  const response = await fetch(
    buildUrl(`/session/${sessionId}/revert`, directory ? { directory } : undefined),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageID }),
    }
  )
  if (!response.ok) {
    throw new Error(`Failed to revert message: ${response.statusText}`)
  }
  return response.ok
}

export async function unrevertSession(sessionId: string, directory?: string) {
  const response = await fetch(
    buildUrl(`/session/${sessionId}/unrevert`, directory ? { directory } : undefined),
    {
      method: 'POST',
    }
  )
  if (!response.ok) {
    throw new Error(`Failed to unrevert session: ${response.statusText}`)
  }
  return response.ok
}

export async function runCommand(
  sessionId: string,
  command: string,
  args?: string[],
  directory?: string,
) {
  const body: Record<string, unknown> = { command }
  if (args) body.args = args

  const response = await fetch(
    buildUrl(`/session/${sessionId}/shell`, directory ? { directory } : undefined),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  if (!response.ok) {
    throw new Error(`Failed to run command: ${response.statusText}`)
  }
  return response.json()
}

export async function findFiles(query: string) {
  const response = await fetch(buildUrl('/find/file', { query }))
  if (!response.ok) {
    throw new Error(`Failed to find files: ${response.statusText}`)
  }
  return response.json()
}

export async function findInFiles(pattern: string) {
  const response = await fetch(buildUrl('/find', { pattern }))
  if (!response.ok) {
    throw new Error(`Failed to find in files: ${response.statusText}`)
  }
  return response.json()
}

export async function findSymbols(query: string) {
  const response = await fetch(buildUrl('/find/symbol', { query }))
  if (!response.ok) {
    throw new Error(`Failed to find symbols: ${response.statusText}`)
  }
  return response.json()
}

export async function readFile(filePath: string, directory?: string) {
  const params: Record<string, string> = { path: filePath }
  if (directory) params.directory = directory
  const url = buildUrl('/file/content', params)
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to read file: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data
}

export async function getFileStatus() {
  const response = await fetch(buildUrl('/file/status'))
  if (!response.ok) {
    throw new Error(`Failed to get file status: ${response.statusText}`)
  }
  return response.json()
}

export async function respondToPermission(
  sessionId: string,
  permissionId: string,
  permissionResponse: boolean,
  directory?: string,
) {
  const response = await fetch(
    buildUrl(
      `/session/${sessionId}/permissions/${permissionId}`,
      directory ? { directory } : undefined
    ),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: permissionResponse }),
    },
  )
  if (!response.ok) {
    throw new Error(`Failed to respond to permission: ${response.statusText}`)
  }
  return response.ok
}

export async function initApp() {
  const response = await fetch(buildUrl('/app/init'), {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Failed to initialize app: ${response.statusText}`)
  }
  return response.json()
}

export async function getAppInfo() {
  const response = await fetch(buildUrl('/app'))
  if (!response.ok) {
    throw new Error(`Failed to get app info: ${response.statusText}`)
  }
  return response.json()
}

export async function getConfig() {
  const response = await fetch(buildUrl('/config'))
  if (!response.ok) {
    throw new Error(`Failed to get config: ${response.statusText}`)
  }
  return response.json()
}

export async function getSessionChildren(sessionId: string, directory?: string) {
  const response = await fetch(
    buildUrl(`/session/${sessionId}/children`, directory ? { directory } : undefined)
  )
  if (!response.ok) {
    throw new Error(`Failed to get session children: ${response.statusText}`)
  }
  return response.json()
}

export async function initSession(
  sessionId: string,
  messageID: string,
  providerID: string,
  modelID: string,
  directory?: string,
) {
  const response = await fetch(
    buildUrl(`/session/${sessionId}/init`, directory ? { directory } : undefined),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageID, providerID, modelID }),
    }
  )
  if (!response.ok) {
    throw new Error(`Failed to init session: ${response.statusText}`)
  }
  return response.ok
}

export async function summarizeSession(sessionId: string, directory?: string) {
  const response = await fetch(
    buildUrl(`/session/${sessionId}/summarize`, directory ? { directory } : undefined),
    {
      method: 'POST',
    }
  )
  if (!response.ok) {
    throw new Error(`Failed to summarize session: ${response.statusText}`)
  }
  return response.ok
}

export async function appendPrompt(text: string) {
  const response = await fetch(buildUrl('/tui/append-prompt'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!response.ok) {
    throw new Error(`Failed to append prompt: ${response.statusText}`)
  }
  return response.json()
}

export async function submitPrompt() {
  const response = await fetch(buildUrl('/tui/submit-prompt'), {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Failed to submit prompt: ${response.statusText}`)
  }
  return response.json()
}

export async function clearPrompt() {
  const response = await fetch(buildUrl('/tui/clear-prompt'), {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Failed to clear prompt: ${response.statusText}`)
  }
  return response.json()
}

export async function executeCommand(command: string) {
  const response = await fetch(buildUrl('/tui/execute-command'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  })
  if (!response.ok) {
    throw new Error(`Failed to execute command: ${response.statusText}`)
  }
  return response.json()
}

export async function showToast(
  message: string,
  title?: string,
  variant?: 'success' | 'error' | 'warning' | 'info',
) {
  const response = await fetch(buildUrl('/tui/show-toast'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, message, variant }),
  })
  if (!response.ok) {
    throw new Error(`Failed to show toast: ${response.statusText}`)
  }
  return response.json()
}

export async function listProjects(directory?: string) {
  const url = buildUrl('/project', directory ? { directory } : undefined)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to list projects: ${response.statusText}`)
  }
  return response.json()
}

export async function getCurrentProject(directory?: string) {
  const url = buildUrl('/project/current', directory ? { directory } : undefined)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to get current project: ${response.statusText}`)
  }
  return response.json()
}

export async function getCurrentPath(directory?: string) {
  const url = buildUrl('/path', directory ? { directory } : undefined)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to get current path: ${response.statusText}`)
  }
  return response.json()
}

export async function listFiles(path: string, directory?: string) {
  const params: Record<string, string> = { path }
  if (directory) params.directory = directory
  const response = await fetch(buildUrl('/file', params))
  if (!response.ok) {
    throw new Error(`Failed to list files: ${response.statusText}`)
  }
  return response.json()
}

export async function readFileContent(filePath: string, directory?: string) {
  const params: Record<string, string> = { path: filePath }
  if (directory) params.directory = directory
  const response = await fetch(buildUrl('/file', params))
  if (!response.ok) {
    throw new Error(`Failed to read file content: ${response.statusText}`)
  }
  return response.json()
}

export async function getToolIds(directory?: string) {
  const url = buildUrl(
    '/experimental/tool/ids',
    directory ? { directory } : undefined,
  )
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to get tool IDs: ${response.statusText}`)
  }
  return response.json()
}

export async function getTools(
  provider: string,
  model: string,
  directory?: string,
) {
  const params: Record<string, string> = { provider, model }
  if (directory) params.directory = directory
  const response = await fetch(buildUrl('/experimental/tool', params))
  if (!response.ok) {
    throw new Error(`Failed to get tools: ${response.statusText}`)
  }
  return response.json()
}

export async function getCommands(directory?: string) {
  const url = buildUrl('/command', directory ? { directory } : undefined)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to get commands: ${response.statusText}`)
  }
  return response.json()
}

export async function updateConfig(config: Record<string, unknown>, directory?: string) {
  const url = buildUrl('/config', directory ? { directory } : undefined)
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!response.ok) {
    throw new Error(`Failed to update config: ${response.statusText}`)
  }
  return response.json()
}

export async function setAuth(providerId: string, auth: { type: string; key: string }, directory?: string) {
  const url = buildUrl(`/auth/${providerId}`, directory ? { directory } : undefined)
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(auth),
  })
  if (!response.ok) {
    throw new Error(`Failed to set auth: ${response.statusText}`)
  }
  return response.json()
}