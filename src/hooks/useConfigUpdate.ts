import { useState } from "react";
import { openCodeService } from "@/lib/opencode-client";
import { mergeConfigUpdate } from "@/lib/opencode-config-helpers";
import type { OpencodeConfig, AgentConfig, CommandConfig, ProviderConfig } from "@/types/opencode";

/**
 * Hook for updating OpenCode configuration.
 * 
 * This hook handles both global and project-scoped config updates.
 * - Global updates: Applied to ~/.config/opencode/opencode.jsonc (or equivalent)
 * - Project updates: Applied to <project-root>/opencode.jsonc
 * 
 * @param config - Current config state
 * @param loadConfig - Function to reload config from server
 * @param directory - Project directory (if any)
 */
export function useConfigUpdate(
  config: OpencodeConfig | null,
  loadConfig: (options?: { force?: boolean }) => Promise<OpencodeConfig | null>,
  directory?: string,
) {
  const [updating, setUpdating] = useState(false);

  const updateConfigField = async <K extends keyof OpencodeConfig>(
    field: K,
    value: OpencodeConfig[K],
    options?: { optimistic?: boolean; scope?: "global" | "project" }
  ): Promise<boolean> => {
    try {
      setUpdating(true);
      
      // Optimistic update - update local state immediately
      if (options?.optimistic && config) {
        // Trigger a re-render with optimistic data by calling loadConfig with force
        // This will be overridden when the actual server response comes back
        await loadConfig({ force: true });
      }
      
      // Determine scope based on explicit option or whether directory is provided
      // If scope is explicitly provided, use it; otherwise infer from directory presence
      // When no project is selected (directory is undefined), always use global scope
      const scope = options?.scope ?? (directory ? "project" : "global");
      
      // Send update to server with appropriate scope
      // IMPORTANT: Only pass directory for project-scoped updates
      // For global updates, we must NOT pass directory to ensure it writes to global config
      await openCodeService.updateConfig(
        { [field]: value }, 
        { 
          directory: scope === "project" && directory ? directory : undefined,
          scope 
        }
      );
      
      // Always reload config from server after update to ensure consistency
      // This prevents stale config issues when refreshing the page
      await loadConfig({ force: true });
      return true;
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to update config:", error);
      }
      // Reload config to revert optimistic update on error
      await loadConfig({ force: true });
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const updateAgentModel = async (
    agentName: string,
    providerID: string,
    modelID: string,
  ): Promise<boolean> => {
    const newAgentConfig = {
      ...config?.agent,
      [agentName]: {
        ...config?.agent?.[agentName],
        model: { providerID, modelID },
      },
    };
    return updateConfigField("agent", newAgentConfig);
  };

  const updateAgent = async (
    agentName: string,
    agentConfig: Partial<AgentConfig>,
    options?: { scope?: "global" | "project" }
  ): Promise<boolean> => {
    const newAgentConfig = {
      ...config?.agent,
      [agentName]: {
        ...config?.agent?.[agentName],
        ...agentConfig,
      },
    };
    return updateConfigField("agent", newAgentConfig, options);
  };

  const createAgent = async (
    agentName: string,
    agentConfig: AgentConfig,
    options?: { scope?: "global" | "project" }
  ): Promise<boolean> => {
    const newAgentConfig = {
      ...config?.agent,
      [agentName]: agentConfig,
    };
    return updateConfigField("agent", newAgentConfig, options);
  };

  const deleteAgent = async (agentName: string, options?: { scope?: "global" | "project" }): Promise<boolean> => {
    const newAgentConfig = { ...config?.agent };
    delete newAgentConfig[agentName];
    return updateConfigField("agent", newAgentConfig, options);
  };

  const updateCommand = async (
    commandName: string,
    commandConfig: Partial<CommandConfig>,
    options?: { scope?: "global" | "project" }
  ): Promise<boolean> => {
    const newCommandConfig = {
      ...config?.command,
      [commandName]: {
        ...config?.command?.[commandName],
        ...commandConfig,
      },
    };
    return updateConfigField("command", newCommandConfig, options);
  };

  const createCommand = async (
    commandName: string,
    commandConfig: CommandConfig,
    options?: { scope?: "global" | "project" }
  ): Promise<boolean> => {
    const newCommandConfig = {
      ...config?.command,
      [commandName]: commandConfig,
    };
    return updateConfigField("command", newCommandConfig, options);
  };

  const deleteCommand = async (commandName: string, options?: { scope?: "global" | "project" }): Promise<boolean> => {
    const newCommandConfig = { ...config?.command };
    delete newCommandConfig[commandName];
    return updateConfigField("command", newCommandConfig, options);
  };

  const updateProvider = async (
    providerName: string,
    providerConfig: Partial<ProviderConfig>,
    options?: { scope?: "global" | "project" }
  ): Promise<boolean> => {
    const newProviderConfig = {
      ...config?.provider,
      [providerName]: {
        ...config?.provider?.[providerName],
        ...providerConfig,
      },
    };
    return updateConfigField("provider", newProviderConfig, options);
  };

  const createProvider = async (
    providerName: string,
    providerConfig: ProviderConfig,
    options?: { scope?: "global" | "project" }
  ): Promise<boolean> => {
    const newProviderConfig = {
      ...config?.provider,
      [providerName]: providerConfig,
    };
    return updateConfigField("provider", newProviderConfig, options);
  };

  const deleteProvider = async (providerName: string, options?: { scope?: "global" | "project" }): Promise<boolean> => {
    const newProviderConfig = { ...config?.provider };
    delete newProviderConfig[providerName];
    return updateConfigField("provider", newProviderConfig, options);
  };

  const updateMcpServer = async (
    serverName: string,
    serverConfig: any,
    options?: { scope?: "global" | "project" }
  ): Promise<boolean> => {
    const newMcpConfig = {
      ...config?.mcp,
      [serverName]: serverConfig,
    };
    return updateConfigField("mcp", newMcpConfig, options);
  };

  const deleteMcpServer = async (serverName: string, options?: { scope?: "global" | "project" }): Promise<boolean> => {
    const newMcpConfig = { ...config?.mcp };
    delete newMcpConfig[serverName];
    return updateConfigField("mcp", newMcpConfig, options);
  };

  const updatePermission = async (
    permission: Partial<OpencodeConfig["permission"]>,
    options?: { scope?: "global" | "project" }
  ): Promise<boolean> => {
    const newPermission = {
      ...config?.permission,
      ...permission,
    };
    return updateConfigField("permission", newPermission, options);
  };

  const updateTools = async (
    tools: Partial<OpencodeConfig["tools"]>,
    options?: { scope?: "global" | "project" }
  ): Promise<boolean> => {
    const newTools = {
      ...config?.tools,
      ...tools,
    };
    return updateConfigField("tools", newTools, options);
  };

  const updateExperimental = async (
    experimental: Partial<OpencodeConfig["experimental"]>,
    options?: { scope?: "global" | "project" }
  ): Promise<boolean> => {
    const newExperimental = {
      ...config?.experimental,
      ...experimental,
    };
    return updateConfigField("experimental", newExperimental, options);
  };

  const updateKeybinds = async (
    keybinds: Partial<OpencodeConfig["keybinds"]>,
    options?: { scope?: "global" | "project" }
  ): Promise<boolean> => {
    const newKeybinds = {
      ...config?.keybinds,
      ...keybinds,
    };
    return updateConfigField("keybinds", newKeybinds, options);
  };

  const updateTui = async (
    tui: Partial<OpencodeConfig["tui"]>,
    options?: { scope?: "global" | "project" }
  ): Promise<boolean> => {
    const newTui = {
      ...config?.tui,
      ...tui,
    };
    return updateConfigField("tui", newTui, options);
  };

  return { 
    updateConfigField, 
    updateAgentModel, 
    updateAgent,
    createAgent,
    deleteAgent,
    updateCommand,
    createCommand,
    deleteCommand,
    updateProvider,
    createProvider,
    deleteProvider,
    updateMcpServer,
    deleteMcpServer,
    updatePermission,
    updateTools,
    updateExperimental,
    updateKeybinds,
    updateTui,
    updating 
  };
}
