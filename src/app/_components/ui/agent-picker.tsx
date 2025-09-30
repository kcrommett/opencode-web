import React from 'react';
import { Badge, Separator, Button } from './index';

interface Agent {
  id: string;
  name: string;
  description?: string;
}

interface AgentPickerProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelect: (agent: Agent) => void;
  onClose: () => void;
}

export const AgentPicker: React.FC<AgentPickerProps> = ({
  agents,
  selectedAgent,
  onSelect,
  onClose,
}) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="rounded border overflow-hidden shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto"
        style={{ 
          backgroundColor: 'var(--theme-background)',
          borderColor: 'var(--theme-primary)',
          borderWidth: '1px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          <h2 className="text-lg font-bold mb-2">Select Agent</h2>
          <Separator className="mb-4" />
        </div>
        
        <div className="px-4 pb-4 space-y-2">
          {agents.map((agent) => {
            const isSelected = selectedAgent?.id === agent.id;
            return (
              <div
                key={agent.id}
                className="p-3 rounded cursor-pointer transition-colors"
                style={{
                  backgroundColor: isSelected ? 'var(--theme-primary)' : 'var(--theme-backgroundAlt)',
                  color: isSelected ? 'var(--theme-background)' : 'var(--theme-foreground)',
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
                      <div className="text-xs opacity-70 mt-1">{agent.description}</div>
                    )}
                  </div>
                  {isSelected && (
                    <Badge variant="background2" cap="round" className="text-xs ml-2">
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
            variant="foreground0"
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