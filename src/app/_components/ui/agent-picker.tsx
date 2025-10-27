import React, { useEffect } from "react";
import { Badge, Separator, Button } from "./index";
import type { Agent, OpencodeConfig } from "@/types/opencode";
import { getAgentModel } from "@/lib/config";

interface AgentPickerProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelect: (agent: Agent) => void;
  onClose: () => void;
  config?: OpencodeConfig | null;
}

export const AgentPicker: React.FC<AgentPickerProps> = ({
  agents,
  selectedAgent,
  onSelect,
  onClose,
  config,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      data-dialog-open="true"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="rounded border overflow-hidden shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto scrollbar"
        style={{
          backgroundColor: "var(--theme-background)",
          borderColor: "var(--theme-primary)",
          borderWidth: "1px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          <h2 className="text-lg font-bold mb-2">Select Agent</h2>
          <Separator className="mb-4" />
        </div>

        <div className="px-4 pb-4 space-y-2">
          {agents.map((agent, index) => {
            const agentId = agent.id || agent.name;
            const selectedId = selectedAgent?.id || selectedAgent?.name;
            const isSelected = selectedId === agentId;
            const configModel = getAgentModel(config || null, agent);
            
            return (
              <div
                key={`agent-${agentId}-${index}`}
                className="p-3 rounded cursor-pointer transition-colors"
                style={{
                  backgroundColor: isSelected
                    ? "var(--theme-primary)"
                    : "var(--theme-backgroundAlt)",
                  color: isSelected
                    ? "var(--theme-background)"
                    : "var(--theme-foreground)",
                }}
                onClick={() => {
                  onSelect(agent);
                  onClose();
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{agent.name}</div>
                    {agent.description && (
                      <div className="text-xs opacity-70 mt-1">
                        {agent.description}
                      </div>
                    )}
                    {configModel && (
                      <div className="text-xs opacity-60 mt-1">
                        Model: {configModel.providerID}/{configModel.modelID} (from config)
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Badge
                      variant="background2"
                      cap="round"
                      className="text-xs ml-2"
                    >
                      Current
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Separator />
        <div className="p-4 flex justify-end">
           <Button
             variant="background2"
             box="round"
             onClick={onClose}
             size="small"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
