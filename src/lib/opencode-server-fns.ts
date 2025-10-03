import { createServerFn } from '@tanstack/react-start'
import * as httpApi from './opencode-http-api'

export const getAgents = createServerFn({ method: 'GET' }).handler(
  async () => {
    return httpApi.getAgents()
  },
)

export const getProviders = createServerFn({ method: 'GET' }).handler(
  async () => {
    return httpApi.getProviders()
  },
)

export const getSessions = createServerFn({ method: 'GET' })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.getSessions(data.directory)
  })

export const getSession = createServerFn({ method: 'GET' })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.getSession(data.sessionId, data.directory)
  })

export const createSession = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { title?: string; parentID?: string; directory?: string }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.createSession(
      { title: data.title, parentID: data.parentID },
      data.directory,
    )
  })

export const deleteSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.deleteSession(data.sessionId, data.directory)
  })

export const updateSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string; title?: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.updateSession(data.sessionId, { title: data.title }, data.directory)
  })

export const getMessages = createServerFn({ method: 'GET' })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.getMessages(data.sessionId, data.directory)
  })

export const getMessage = createServerFn({ method: 'GET' })
  .inputValidator((data: { sessionId: string; messageId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.getMessage(data.sessionId, data.messageId, data.directory)
  })

export const sendMessage = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      sessionId: string
      content: string
      providerID?: string
      modelID?: string
      directory?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.sendMessage(
      data.sessionId,
      data.content,
      data.providerID,
      data.modelID,
      data.directory,
    )
  })

export const abortSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.abortSession(data.sessionId, data.directory)
  })

export const shareSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.shareSession(data.sessionId, data.directory)
  })

export const unshareSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.unshareSession(data.sessionId, data.directory)
  })

export const revertMessage = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string; messageID: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.revertMessage(data.sessionId, data.messageID, data.directory)
  })

export const unrevertSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.unrevertSession(data.sessionId, data.directory)
  })

export const runCommand = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { sessionId: string; command: string; args?: string[]; directory?: string }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.runCommand(data.sessionId, data.command, data.args, data.directory)
  })

export const findFiles = createServerFn({ method: 'GET' })
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.findFiles(data.query)
  })

export const findInFiles = createServerFn({ method: 'GET' })
  .inputValidator((data: { pattern: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.findInFiles(data.pattern)
  })

export const findSymbols = createServerFn({ method: 'GET' })
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.findSymbols(data.query)
  })

export const readFile = createServerFn({ method: 'GET' })
  .inputValidator((data: { filePath: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.readFile(data.filePath, data.directory)
  })

export const getFileStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    return httpApi.getFileStatus()
  },
)

export const respondToPermission = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      sessionId: string
      permissionId: string
      response: boolean
      directory?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.respondToPermission(
      data.sessionId,
      data.permissionId,
      data.response,
      data.directory,
    )
  })

export const initApp = createServerFn({ method: 'POST' }).handler(async () => {
  return httpApi.initApp()
})

export const getAppInfo = createServerFn({ method: 'GET' }).handler(
  async () => {
    return httpApi.getAppInfo()
  },
)

export const getConfig = createServerFn({ method: 'GET' }).handler(async () => {
  return httpApi.getConfig()
})

export const getSessionChildren = createServerFn({ method: 'GET' })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.getSessionChildren(data.sessionId, data.directory)
  })

export const initSession = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      sessionId: string
      messageID: string
      providerID: string
      modelID: string
      directory?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.initSession(
      data.sessionId,
      data.messageID,
      data.providerID,
      data.modelID,
      data.directory,
    )
  })

export const summarizeSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.summarizeSession(data.sessionId, data.directory)
  })

export const appendPrompt = createServerFn({ method: 'POST' })
  .inputValidator((data: { text: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.appendPrompt(data.text)
  })

export const submitPrompt = createServerFn({ method: 'POST' }).handler(
  async () => {
    return httpApi.submitPrompt()
  },
)

export const clearPrompt = createServerFn({ method: 'POST' }).handler(
  async () => {
    return httpApi.clearPrompt()
  },
)

export const executeCommand = createServerFn({ method: 'POST' })
  .inputValidator((data: { command: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.executeCommand(data.command)
  })

export const showToast = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      message: string
      title?: string
      variant?: 'success' | 'error' | 'warning' | 'info'
    }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.showToast(data.message, data.title, data.variant)
  })

export const listProjects = createServerFn({ method: 'GET' })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.listProjects(data.directory)
  })

export const getCurrentProject = createServerFn({ method: 'GET' })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.getCurrentProject(data.directory)
  })

export const getCurrentPath = createServerFn({ method: 'GET' })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.getCurrentPath(data.directory)
  })

export const listFiles = createServerFn({ method: 'GET' })
  .inputValidator((data: { path: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.listFiles(data.path, data.directory)
  })

export const readFileContent = createServerFn({ method: 'GET' })
  .inputValidator((data: { filePath: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.readFileContent(data.filePath, data.directory)
  })

export const getToolIds = createServerFn({ method: 'GET' })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.getToolIds(data.directory)
  })

export const getTools = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { provider: string; model: string; directory?: string }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.getTools(data.provider, data.model, data.directory)
  })

export const getCommands = createServerFn({ method: 'GET' })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.getCommands(data.directory)
  })

export const updateConfig = createServerFn({ method: 'POST' })
  .inputValidator((data: { config: Record<string, unknown>; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.updateConfig(data.config, data.directory)
  })

export const setAuth = createServerFn({ method: 'POST' })
  .inputValidator((data: { providerId: string; auth: { type: string; key: string }; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.setAuth(data.providerId, data.auth, data.directory)
  })