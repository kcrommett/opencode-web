// Simple validation utilities for OpenCode config
// For now, we'll just export the types and basic validation functions
// Zod integration can be added later when the API stabilizes

import type {
  OpencodeConfig,
  AgentConfig,
  CommandConfig,
  ProviderConfig,
  PermissionConfig,
  ToolsConfig,
  ExperimentalConfig,
  McpServerConfig,
  McpConfig,
  ProviderModelConfig,
  LspServerConfig,
  LspConfig,
  KeybindsConfig,
  TuiConfig
} from "@/types/opencode";

// Re-export the types
export type {
  OpencodeConfig,
  AgentConfig,
  CommandConfig,
  ProviderConfig,
  PermissionConfig,
  ToolsConfig,
  ExperimentalConfig,
  McpServerConfig,
  McpConfig,
  ProviderModelConfig,
  LspServerConfig,
  LspConfig,
  KeybindsConfig,
  TuiConfig
} from "@/types/opencode";

// Basic validation helpers - these can be enhanced with Zod later
export function validateConfig(config: unknown): { success: boolean; data?: any; error?: any } {
  try {
    // Basic validation - check if it's an object
    if (typeof config !== 'object' || config === null) {
      return { success: false, error: { message: "Config must be an object" } };
    }
    
    // For now, just return success - we can add more validation later
    return { success: true, data: config };
  } catch (error) {
    return { success: false, error };
  }
}

export function validateConfigPartial(config: unknown): { success: boolean; data?: any; error?: any } {
  return validateConfig(config);
}

export function validateAgentConfig(config: unknown): { success: boolean; data?: any; error?: any } {
  return validateConfig(config);
}

export function validateCommandConfig(config: unknown): { success: boolean; data?: any; error?: any } {
  return validateConfig(config);
}

export function validateProviderConfig(config: unknown): { success: boolean; data?: any; error?: any } {
  return validateConfig(config);
}

export function validateMcpServerConfig(config: unknown): { success: boolean; data?: any; error?: any } {
  return validateConfig(config);
}

// Utility functions for config manipulation
export function mergeConfig(current: OpencodeConfig, updates: Partial<OpencodeConfig>): OpencodeConfig {
  return {
    ...current,
    ...updates,
    agent: { ...current.agent, ...updates.agent },
    command: { ...current.command, ...updates.command },
    provider: { ...current.provider, ...updates.provider },
    permission: { ...current.permission, ...updates.permission },
    tools: { ...current.tools, ...updates.tools },
    experimental: { ...current.experimental, ...updates.experimental },
    mcp: { ...current.mcp, ...updates.mcp },
    lsp: { ...current.lsp, ...updates.lsp },
    keybinds: { ...current.keybinds, ...updates.keybinds },
    features: { ...current.features, ...updates.features },
  };
}

export function formatMcpCommand(command: string | string[]): string[] {
  if (Array.isArray(command)) {
    return command;
  }
  return command.split(" ");
}

export function parseModelString(model: string): { providerID: string; modelID: string } | null {
  const parts = model.split("/");
  if (parts.length === 2) {
    return {
      providerID: parts[0],
      modelID: parts[1],
    };
  }
  return null;
}

export function formatModelString(providerID: string, modelID: string): string {
  return `${providerID}/${modelID}`;
}