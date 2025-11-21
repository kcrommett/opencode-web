/**
 * OpenCode configuration utilities
 * Provides helpers for merging partial updates, formatting config data, and mapping enums for UI consumption
 */

import type { 
  OpencodeConfig, 
  AgentConfig, 
  ProviderConfig,
  KeybindsConfig
} from "@/types/opencode";

/**
 * Merge partial config updates into existing config
 * Handles nested objects properly to avoid losing existing data
 */
export function mergeConfigUpdate(
  current: OpencodeConfig | null,
  updates: Partial<OpencodeConfig>
): OpencodeConfig {
  if (!current) {
    return updates as OpencodeConfig;
  }

  return {
    ...current,
    ...updates,
    // Handle nested objects with proper merging
    agent: updates.agent ? { ...current.agent, ...updates.agent } : current.agent,
    command: updates.command ? { ...current.command, ...updates.command } : current.command,
    provider: updates.provider ? { ...current.provider, ...updates.provider } : current.provider,
    permission: updates.permission ? { ...current.permission, ...updates.permission } : current.permission,
    tools: updates.tools ? { ...current.tools, ...updates.tools } : current.tools,
    experimental: updates.experimental ? { ...current.experimental, ...updates.experimental } : current.experimental,
    mcp: updates.mcp ? { ...current.mcp, ...updates.mcp } : current.mcp,
    lsp: updates.lsp ? { ...current.lsp, ...updates.lsp } : current.lsp,
    keybinds: updates.keybinds ? { ...current.keybinds, ...updates.keybinds } : current.keybinds,
    tui: updates.tui ? { ...current.tui, ...updates.tui } : current.tui,
    features: updates.features ? { ...current.features, ...updates.features } : current.features,
  };
}

/**
 * Format MCP command array for UI display
 * Converts command array to readable string format
 */
export function formatMcpCommandDisplay(command: string[]): string {
  if (!command || command.length === 0) {
    return "";
  }
  
  // Join command parts, handling arguments with spaces by quoting them
  return command.map(part => {
    // Quote parts that contain spaces or special characters
    if (part.includes(" ") || part.includes("'") || part.includes('"')) {
      return `"${part.replace(/"/g, '\\"')}"`;
    }
    return part;
  }).join(" ");
}

/**
 * Parse MCP command string back to array format
 * Handles quoted arguments properly
 */
export function parseMcpCommandString(commandStr: string): string[] {
  if (!commandStr.trim()) {
    return [];
  }
  
  // Simple parser for quoted arguments
  const args: string[] = [];
  let current = "";
  let inQuotes = false;
  let escapeNext = false;
  
  for (let i = 0; i < commandStr.length; i++) {
    const char = commandStr[i];
    
    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }
    
    if (char === "\\" && inQuotes) {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !inQuotes) {
      inQuotes = true;
      continue;
    }
    
    if (char === '"' && inQuotes) {
      inQuotes = false;
      continue;
    }
    
    if (char === " " && !inQuotes) {
      if (current.trim()) {
        args.push(current.trim());
        current = "";
      }
      continue;
    }
    
    current += char;
  }
  
  if (current.trim()) {
    args.push(current.trim());
  }
  
  return args;
}

/**
 * Permission enum values for UI dropdowns
 */
export const PERMISSION_VALUES = ["ask", "allow", "deny"] as const;
export type PermissionValue = typeof PERMISSION_VALUES[number];

/**
 * Get permission label for UI display
 */
export function getPermissionLabel(permission: PermissionValue): string {
  switch (permission) {
    case "ask":
      return "Ask Every Time";
    case "allow":
      return "Always Allow";
    case "deny":
      return "Always Deny";
    default:
      return permission;
  }
}

/**
 * Tool names and their descriptions for UI
 */
export const TOOL_DESCRIPTIONS: Record<string, string> = {
  bash: "Execute shell commands",
  read: "Read file contents",
  write: "Write to files",
  edit: "Edit files in place",
  glob: "Search for files using glob patterns",
  grep: "Search within files",
  list: "List directory contents",
  webfetch: "Fetch content from URLs",
  task: "Create and manage tasks",
  todowrite: "Write todo items",
  todoread: "Read todo items",
};

/**
 * Get available tool names
 */
export function getToolNames(): string[] {
  return Object.keys(TOOL_DESCRIPTIONS);
}

/**
 * Experimental feature descriptions
 */
export const EXPERIMENTAL_FEATURE_DESCRIPTIONS: Record<string, string> = {
  chatMaxRetries: "Maximum number of retry attempts for failed chat requests",
  disable_paste_summary: "Disable automatic summarization of pasted content",
  hook: "Custom hooks for file editing and session completion events",
};

/**
 * MCP server type options for UI
 */
export const MCP_SERVER_TYPES = ["local", "remote"] as const;
export type McpServerType = typeof MCP_SERVER_TYPES[number];

/**
 * Get MCP server type label
 */
export function getMcpServerTypeLabel(type: McpServerType): string {
  switch (type) {
    case "local":
      return "Local Command";
    case "remote":
      return "Remote URL";
    default:
      return type;
  }
}

/**
 * Provider configuration defaults
 */
export const PROVIDER_CONFIG_DEFAULTS: Partial<ProviderConfig> = {
  options: {
    timeout: 300000, // 5 minutes default
  },
};

/**
 * Agent configuration defaults
 */
export const AGENT_CONFIG_DEFAULTS: Partial<AgentConfig> = {
  temperature: 0.7,
  topP: 0.9,
};

/**
 * Default keybinds for reference
 */
export const DEFAULT_KEYBINDS: Partial<KeybindsConfig> = {
  leader: "ctrl+x",
  app_exit: "ctrl+c,ctrl+d,<leader>q",
  editor_open: "<leader>e",
  theme_list: "<leader>t",
  sidebar_toggle: "<leader>b",
  status_view: "<leader>s",
  session_new: "<leader>n",
  session_list: "<leader>l",
  session_compact: "<leader>c",
  messages_copy: "<leader>y",
  messages_undo: "<leader>u",
  messages_redo: "<leader>r",
  model_list: "<leader>m",
  model_cycle_recent: "f2",
  command_list: "ctrl+p",
  agent_list: "<leader>a",
  agent_cycle: "tab",
  agent_cycle_reverse: "shift+tab",
  input_clear: "ctrl+c",
  input_submit: "return",
  history_previous: "up",
  history_next: "down",
};

/**
 * Validate model string format (provider/model)
 */
export function validateModelString(model: string): boolean {
  const parts = model.split("/");
  return parts.length === 2 && parts[0].trim() !== "" && parts[1].trim() !== "";
}

/**
 * Parse model string to provider and model IDs
 */
export function parseModelString(model: string): { providerID: string; modelID: string } | null {
  if (!validateModelString(model)) {
    return null;
  }
  const parts = model.split("/");
  return {
    providerID: parts[0].trim(),
    modelID: parts[1].trim(),
  };
}

/**
 * Format provider and model IDs to model string
 */
export function formatModelString(providerID: string, modelID: string): string {
  return `${providerID}/${modelID}`;
}

/**
 * Get config section descriptions for UI help text
 */
export const CONFIG_SECTION_DESCRIPTIONS: Record<string, string> = {
  theme: "UI theme and appearance settings",
  model: "Default AI model configuration",
  small_model: "Smaller/faster model for simple tasks",
  share: "Session sharing behavior",
  autoupdate: "Automatic update settings",
  snapshot: "Session snapshot settings",
  username: "User identification",
  disabled_providers: "List of disabled AI providers",
  plugin: "Enabled plugins",
  instructions: "Custom instruction files",
  agent: "AI agent configurations",
  command: "Custom command definitions",
  provider: "AI provider configurations",
  permission: "Tool permission settings",
  tools: "Individual tool toggles",
  experimental: "Experimental features",
  mcp: "Model Context Protocol servers",
  lsp: "Language Server Protocol configuration",
  keybinds: "Keyboard shortcuts",
  tui: "Terminal UI settings",
  features: "Feature flags",
};

/**
 * Create a minimal config object with defaults
 */
export function createMinimalConfig(): OpencodeConfig {
  return {
    theme: "default",
    model: "anthropic/claude-sonnet-4-20250514",
    share: "manual",
    autoupdate: true,
    snapshot: true,
    permission: {
      edit: "ask",
      bash: "ask",
      webfetch: "ask",
    },
    tools: {
      bash: true,
      read: true,
      write: true,
      edit: true,
      glob: true,
      grep: true,
      list: true,
      webfetch: true,
      task: true,
      todowrite: true,
      todoread: true,
    },
  };
}

/**
 * Validate config updates before applying
 */
export function validateConfigUpdate(
  _current: OpencodeConfig | null,
  updates: Partial<OpencodeConfig>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate model strings
  if (updates.model && !validateModelString(updates.model)) {
    errors.push(`Invalid model format: ${updates.model}. Expected format: provider/model`);
  }
  
  if (updates.small_model && !validateModelString(updates.small_model)) {
    errors.push(`Invalid small model format: ${updates.small_model}. Expected format: provider/model`);
  }
  
  // Validate agent models
  if (updates.agent) {
    Object.entries(updates.agent).forEach(([name, agent]) => {
      if (agent.model && typeof agent.model === "string" && !validateModelString(agent.model)) {
        errors.push(`Invalid model for agent ${name}: ${agent.model}. Expected format: provider/model`);
      }
    });
  }
  
  // Validate command models
  if (updates.command) {
    Object.entries(updates.command).forEach(([name, command]) => {
      if (command.model && typeof command.model === "string" && !validateModelString(command.model)) {
        errors.push(`Invalid model for command ${name}: ${command.model}. Expected format: provider/model`);
      }
    });
  }
  
  // Validate MCP server configurations
  if (updates.mcp) {
    Object.entries(updates.mcp).forEach(([name, server]) => {
      if (server.type === "local" && (!server.command || server.command.length === 0)) {
        errors.push(`MCP server ${name} (local) must have a command array`);
      }
      if (server.type === "remote" && !server.url) {
        errors.push(`MCP server ${name} (remote) must have a URL`);
      }
    });
  }
  
  // Validate provider configurations
  if (updates.provider) {
    Object.entries(updates.provider).forEach(([name, provider]) => {
      if (provider.api) {
        try {
          new URL(provider.api);
        } catch {
          errors.push(`Invalid API URL for provider ${name}: ${provider.api}`);
        }
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}