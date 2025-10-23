export interface Part {
  type: string
  id?: string
  text?: string
  content?: string
  tool?: string
  args?: Record<string, unknown>
  result?: unknown
  path?: string
  diff?: string
  name?: string
  description?: string
  url?: string
  status?: string
  messageID?: string
  [key: string]: unknown
}

export interface PermissionState {
  id: string
  sessionID: string
  message?: string
  details?: unknown
  [key: string]: unknown
}

export interface SessionTodo {
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'high' | 'medium' | 'low'
  id: string
}

export interface FileContentData {
  content: string
  encoding: string | null
  mimeType: string | null
  text: string | null
  dataUrl: string | null
}
