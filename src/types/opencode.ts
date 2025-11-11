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

export interface DiffMetadata {
  raw?: string;
  files?: string[];
  additions?: number;
  deletions?: number;
  hasParsedDiff?: boolean;
}

export interface ToolPartDetail {
  tool: string;
  status: "pending" | "running" | "completed" | "error";
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  error?: {
    message?: string;
    stack?: string;
  };
  state?: {
    status?: string;
    timings?: {
      startTime?: number;
      endTime?: number;
      duration?: number;
    };
  };
  path?: string;
  provider?: string;
  diff?: DiffMetadata;
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

export type Todo = SessionTodo;

export type PermissionResponse = "once" | "always" | "reject";

export interface SessionForkRequest {
  messageID?: string;
  title?: string;
}

export interface SessionForkResponse {
  id: string;
  parentID?: string | null;
  title?: string | null;
  messageID?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
}

export interface FileContentData {
  content: string;
  encoding: string | null;
  mimeType: string | null;
  text: string | null;
  dataUrl: string | null;
  diff?: string; // Unified diff format for modified files
  patch?: {
    oldFileName: string;
    newFileName: string;
    oldHeader?: string;
    newHeader?: string;
    hunks: Array<{
      oldStart: number;
      oldLines: number;
      newStart: number;
      newLines: number;
      lines: string[];
    }>;
    index?: string;
  };
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

export interface PermissionConfig {
  edit?: "ask" | "allow" | "deny";
  bash?: "ask" | "allow" | "deny";
  webfetch?: "ask" | "allow" | "deny";
  [key: string]: "ask" | "allow" | "deny" | undefined;
}

export interface ToolsConfig {
  bash?: boolean;
  read?: boolean;
  write?: boolean;
  edit?: boolean;
  glob?: boolean;
  grep?: boolean;
  list?: boolean;
  webfetch?: boolean;
  task?: boolean;
  todowrite?: boolean;
  todoread?: boolean;
}

export interface ExperimentalHookConfig {
  command: string[];
  environment?: Record<string, string>;
}

export interface ExperimentalConfig {
  chatMaxRetries?: number;
  disable_paste_summary?: boolean;
  hook?: {
    file_edited?: ExperimentalHookConfig[];
    session_completed?: ExperimentalHookConfig[];
    [key: string]: ExperimentalHookConfig[] | undefined;
  };
  [key: string]: unknown;
}

export interface McpServerConfig {
  type: "local" | "remote";
  command?: string[];
  environment?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  enabled?: boolean;
  timeout?: number;
}

export interface McpConfig {
  [serverName: string]: McpServerConfig;
}

export interface ProviderModelConfig {
  name?: string;
  cost?: {
    input?: number;
    output?: number;
  };
  limit?: {
    context?: number;
    output?: number;
  };
}

export interface ProviderConfig {
  api?: string;
  models?: Record<string, ProviderModelConfig>;
  options?: {
    apiKey?: string;
    timeout?: number;
  };
}

export interface LspServerConfig {
  command: string[];
  extensions?: string[];
  environment?: Record<string, string>;
  initialization?: Record<string, unknown>;
  disabled?: boolean;
}

export interface LspConfig {
  [language: string]: LspServerConfig;
}

export interface KeybindsConfig {
  leader?: string;
  app_exit?: string;
  editor_open?: string;
  theme_list?: string;
  sidebar_toggle?: string;
  status_view?: string;
  session_new?: string;
  session_list?: string;
  session_share?: string;
  session_unshare?: string;
  session_compact?: string;
  messages_copy?: string;
  messages_undo?: string;
  messages_redo?: string;
  model_list?: string;
  model_cycle_recent?: string;
  command_list?: string;
  agent_list?: string;
  agent_cycle?: string;
  agent_cycle_reverse?: string;
  input_clear?: string;
  input_submit?: string;
  history_previous?: string;
  history_next?: string;
  [key: string]: string | undefined;
}

export interface TuiConfig {
  scroll_speed?: number;
  [key: string]: unknown;
}

export interface ConfigDiffSummary {
  provider?: true;
  mcp?: true;
  lsp?: true;
  watcher?: true;
  agent?: true;
  command?: true;
  formatter?: true;
  tools?: true;
  permission?: true;
  instructions?: true;
  share?: true;
  autoshare?: true;
  model?: true;
  small_model?: true;
  disabled_providers?: true;
  plugin?: true;
  theme?: true;
  experimental?: true;
  keybinds?: true;
  tui?: true;
  features?: true;
  pluginAdded?: string[];
  pluginRemoved?: string[];
  changedPaths?: string[];
}

export interface OpencodeConfig {
  theme?: string;
  model?: string;
  small_model?: string;
  share?: "manual" | "auto" | "disabled";
  autoupdate?: boolean;
  snapshot?: boolean;
  username?: string;
  disabled_providers?: string[];
  plugin?: string[];
  instructions?: string[];
  agent?: Record<string, AgentConfig>;
  command?: Record<string, CommandConfig>;
  provider?: Record<string, ProviderConfig>;
  permission?: PermissionConfig;
  tools?: ToolsConfig;
  experimental?: ExperimentalConfig;
  mcp?: McpConfig;
  lsp?: LspConfig;
  keybinds?: KeybindsConfig;
  tui?: TuiConfig;
  features?: {
    enableMarkdown?: boolean;
    enableMarkdownImages?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ConfigUpdateResponse {
  merged: OpencodeConfig;
  diff?: ConfigDiffSummary;
  scope?: "global" | "project";
  filepath: string;
}

export interface ConfigUpdatedEventPayload {
  scope: "global" | "project";
  directory?: string;
  filepath?: string;
  before: OpencodeConfig;
  after: OpencodeConfig;
  diff?: ConfigDiffSummary;
}

export interface ConfigErrorPayload {
  name?: "ConfigUpdateError" | "ConfigValidationError" | string;
  message: string;
  path?: string;
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

export type McpServerStatus = "connected" | "failed";

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

export interface LspStatus {
  id: string;
  language?: string;
  status: "starting" | "running" | "stopped" | "failed" | "unknown";
  errors?: number;
  warnings?: number;
  lastError?: string | null;
  updatedAt?: string;
}

export interface FormatterStatus {
  id: string;
  language?: string;
  status: "idle" | "running" | "disabled" | "error";
  lastRunAt?: string;
  lastError?: string | null;
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
  lspStatus: LspStatus[];
  formatterStatus: FormatterStatus[];
  lspStatusError: string | null;
  formatterStatusError: string | null;
}

/**
 * Structured diff data from /session/{id}/diff
 */
export interface FileDiffHunkLine {
  type: "context" | "add" | "remove" | "delete";
  content: string;
  oldNumber?: number | null;
  newNumber?: number | null;
}

export interface FileDiffHunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: FileDiffHunkLine[];
}

export interface FileDiff {
  path?: string;
  oldPath?: string | null;
  newPath?: string | null;
  status?: "added" | "modified" | "deleted" | "renamed" | string;
  additions: number;
  deletions: number;
  diff?: string;
  hunks?: FileDiffHunk[];
  binary?: boolean;
  language?: string;
  file?: string;
  before?: string;
  after?: string;
}

export type SessionDiffResponse = FileDiff[];

/**
 * Session diff from summary
 */
export interface SessionDiff {
  file: string;
  before: string;
  after: string;
  additions: number;
  deletions: number;
}

/**
 * Session summary information
 */
export interface SessionSummary {
  diffs?: SessionDiff[];
}

export interface TuiEvent {
  type: string;
  payload?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TuiControlRequest {
  id: string;
  type: string;
  payload?: Record<string, string | number | boolean | null>;
  requestedAt?: string;
  timeoutMs?: number;
}

export interface TuiControlResponse {
  requestID: string;
  response: Record<string, unknown>;
  respondedAt?: string;
  [key: string]: unknown;
}
