import { useState } from 'react';
import type { Part } from "../../../../node_modules/@opencode-ai/sdk/dist/gen/types.gen";
import { Badge } from '../ui';

interface ReasoningPartProps {
  part: Part;
  showDetails: boolean;
}

export function ReasoningPart({ part, showDetails }: ReasoningPartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (part.type !== 'reasoning') return null;
  
  const text = 'text' in part ? part.text : '';
  
  if (!showDetails) return null;
  
  return (
    <div className="border border-[var(--theme-border)] rounded-md overflow-hidden bg-[var(--theme-backgroundAlt)] mb-2">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-[var(--theme-background)]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span>🧠</span>
          <span className="text-sm font-medium">Thinking...</span>
          <span className="text-xs opacity-60">{isExpanded ? '[-]' : '[+]'}</span>
        </div>
        {text && (
          <Badge variant="foreground0" cap="round" className="text-xs">
            {text.length} chars
          </Badge>
        )}
      </div>
      {isExpanded && text && (
        <div className="border-t border-[var(--theme-border)] p-3 bg-[var(--theme-background)]">
          <pre className="text-sm font-mono whitespace-pre-wrap break-words opacity-80">
            {text}
          </pre>
        </div>
      )}
    </div>
  );
}