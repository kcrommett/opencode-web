import { useState } from "react";
import { openCodeService } from "@/lib/opencode-client";
import type { OpencodeConfig } from "@/types/opencode";

export function useConfigUpdate(
  config: OpencodeConfig | null,
  loadConfig: (options?: { force?: boolean }) => Promise<OpencodeConfig | null>,
) {
  const [updating, setUpdating] = useState(false);

  const updateConfigField = async (
    field: keyof OpencodeConfig,
    value: unknown,
  ): Promise<boolean> => {
    try {
      setUpdating(true);
      await openCodeService.updateConfig({ [field]: value });
      await loadConfig({ force: true });
      return true;
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to update config:", error);
      }
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

  return { updateConfigField, updateAgentModel, updating };
}
