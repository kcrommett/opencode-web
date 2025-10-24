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
  model?: {
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
  [key: string]: unknown;
}
