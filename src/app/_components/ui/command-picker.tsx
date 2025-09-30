import React from 'react';
import { Badge, Separator } from './index';
import type { Command } from '@/lib/commands';

interface CommandPickerProps {
  commands: Command[];
  onSelect: (command: Command) => void;
  selectedIndex?: number;
}

export const CommandPicker: React.FC<CommandPickerProps> = ({
  commands,
  onSelect,
  selectedIndex = 0,
}) => {
  if (commands.length === 0) return null;

  const categories = Array.from(new Set(commands.map(c => c.category)));

  return (
    <div 
      className="absolute bottom-full left-0 right-0 mb-2 rounded border overflow-hidden shadow-lg max-h-64 overflow-y-auto scrollbar"
      style={{ 
        backgroundColor: 'var(--theme-backgroundAlt)',
        borderColor: 'var(--theme-primary)',
        borderWidth: '1px',
        zIndex: 100
      }}
    >
      {categories.map((category, catIndex) => {
        const categoryCommands = commands.filter(c => c.category === category);
        return (
          <div key={category}>
            {catIndex > 0 && <Separator />}
            <div className="px-3 py-1 text-xs font-medium opacity-60 uppercase">
              {category}
            </div>
            {categoryCommands.map((cmd) => {
              const globalIndex = commands.indexOf(cmd);
              const isSelected = globalIndex === selectedIndex;
              return (
                <div
                  key={cmd.name}
                  className="px-3 py-2 cursor-pointer transition-colors"
                  style={{
                    backgroundColor: isSelected ? 'var(--theme-primary)' : 'transparent',
                    color: isSelected ? 'var(--theme-background)' : 'var(--theme-foreground)',
                  }}
                  onClick={() => onSelect(cmd)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--theme-backgroundAlt)';
                      e.currentTarget.style.opacity = '0.8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium">
                        /{cmd.name} {cmd.args && <span className="opacity-70 text-sm">{cmd.args}</span>}
                      </div>
                      <div className="text-xs opacity-70 mt-0.5">{cmd.description}</div>
                    </div>
                    {isSelected && (
                      <Badge variant="background2" cap="round" className="text-xs">
                        ↵
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};