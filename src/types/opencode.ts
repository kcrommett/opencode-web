export interface Part {
  type: string;
  id?: string;
  text?: string;
  content?: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  path?: string;
  diff?: string;
  name?: string;
  description?: string;
  url?: string;
  status?: string;
  messageID?: string;
  [key: string]: unknown;
}

export interface PermissionState {
  id: string;
  sessionID: string;
  message?: string;
  details?: unknown;
  [key: string]: unknown;
}

export interface SessionTodo {
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "high" | "medium" | "low";
  id: string;
}

export interface FileContentData {
  content: string;
  encoding: string | null;
  mimeType: string | null;
  text: string | null;
  dataUrl: string | null;
}

export interface Agent {
  id: string;
  name: string;
  mode: string;
  description?: string;
  model?: {
    providerID: string;
    modelID: string;
  };
}

export interface AgentConfig {
  model?: string | {
    providerID: string;
    modelID: string;
  };
  description?: string;
  prompt?: string;
  temperature?: number;
  topP?: number;
}

export interface CommandConfig {
  description?: string;
  agent?: string;
  model?: string | { providerID: string; modelID: string };
  prompt?: string;
}

export interface Command {
  name: string;
  description?: string;
  agent?: string;
  model?: {
    providerID: string;
    modelID: string;
  };
  prompt?: string;
  trigger?: string[];
  custom?: boolean;
}

export interface ProviderConfig {
  [key: string]: unknown;
}

export interface OpencodeConfig {
  theme?: string;
  model?: string;
  agent?: Record<string, AgentConfig>;
  command?: Record<string, CommandConfig>;
  provider?: Record<string, ProviderConfig>;
  features?: {
    enableMarkdown?: boolean;
    enableMarkdownImages?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SessionUsageTotals {
  input: number;
  output: number;
  reasoning: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  lastMessageId?: string;
}

export type MentionSuggestion =
  | { type: "agent"; name: string; description?: string; label: string }
  | { type: "file"; path: string; label: string };

export interface ImageAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  origin: "paste" | "drop";
}

export type McpServerStatus = "connected" | "failed" | "disabled";

export interface McpStatusResponse {
  [serverName: string]: McpServerStatus;
}

/**
 * LSP Diagnostics aggregated by server
 */
export interface LspDiagnosticsSummary {
  label: string;
  errors: number;
  warnings: number;
  infos: number;
  hints: number;
  lastPath?: string;
  updatedAt: Date;
}

/**
 * Git file status information
 */
export interface GitStatus {
  branch?: string;
  ahead?: number;
  behind?: number;
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
  timestamp: Date;
}

/**
 * Session context information for sidebar
 */
export interface SessionContext {
  id: string;
  title?: string;
  agentName?: string;
  modelId?: string;
  modelName?: string;
  messageCount: number;
  activeSince?: Date;
  lastActivity?: Date;
  tokenUsage?: SessionUsageTotals;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cacheTokens?: {
    read: number;
    write: number;
  };
  isStreaming: boolean;
  lastError?: string | null;
}

/**
 * Complete sidebar status state
 */
export interface SidebarStatusState {
  sessionContext: SessionContext;
  mcpStatus: McpStatusResponse | null;
  mcpStatusLoading: boolean;
  mcpStatusError: string | null;
  lspDiagnostics: Record<string, LspDiagnosticsSummary>;
  gitStatus: GitStatus;
}
