import type { OpencodeConfig, Agent } from "@/types/opencode";

const serverUrl = (() => {
  if (
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_OPENCODE_SERVER_URL
  ) {
    return import.meta.env.VITE_OPENCODE_SERVER_URL;
  }
  if (typeof process !== "undefined" && process.env?.VITE_OPENCODE_SERVER_URL) {
    return process.env.VITE_OPENCODE_SERVER_URL;
  }
  return "";
})();

export const getServerUrl = (): string => serverUrl;

export function getAgentModel(
  config: OpencodeConfig | null,
  agent: Agent | null,
): { providerID: string; modelID: string } | null {
  if (!config || !agent) return null;

  const agentConfig =
    config.agent?.[agent.name] || config.agent?.[agent.id];
  
  if (agentConfig?.model) {
    if (typeof agentConfig.model === 'string') {
      const parts = agentConfig.model.split('/');
      if (parts.length === 2) {
        return {
          providerID: parts[0],
          modelID: parts[1],
        };
      }
    } else {
      return agentConfig.model;
    }
  }

  if (agent.model) {
    return agent.model;
  }

  return null;
}

export function getDefaultModel(
  config: OpencodeConfig | null,
): { providerID: string; modelID: string } | null {
  if (!config?.model) return null;

  const parts = config.model.split("/");
  if (parts.length === 2) {
    return {
      providerID: parts[0],
      modelID: parts[1],
    };
  }

  return null;
}

/**
 * Feature flags for progressive feature rollout.
 */
export interface FeatureFlags {
  enableMarkdown?: boolean;
  enableMarkdownImages?: boolean;
}

/**
 * Get feature flag configuration from OpencodeConfig.
 * Returns default values if not configured.
 */
export function getFeatureFlags(config: OpencodeConfig | null): FeatureFlags {
  const features = config?.features as FeatureFlags | undefined;
  return {
    enableMarkdown: features?.enableMarkdown ?? true,
    enableMarkdownImages: features?.enableMarkdownImages ?? false,
  };
}
