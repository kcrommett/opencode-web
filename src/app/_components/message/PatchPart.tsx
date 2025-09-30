import { useState } from 'react';
import type { Part } from "../../../../node_modules/@opencode-ai/sdk/dist/gen/types.gen";

interface PatchPartProps {
  part: Part;
}

export function PatchPart({ part }: PatchPartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (part.type !== 'patch') return null;
  
  const diff = 'diff' in part ? part.diff : '';
  
  return (
    <div className="border border-[var(--theme-border)] rounded-md overflow-hidden bg-[var(--theme-backgroundAlt)] mb-2">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-[var(--theme-background)]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span>📝</span>
          <span className="text-sm font-medium">File Changes</span>
          <span className="text-xs opacity-60">{isExpanded ? '[-]' : '[+]'}</span>
        </div>
      </div>
      {isExpanded && diff !== undefined && diff !== '' && (
        <div className="border-t border-[var(--theme-border)] p-3 bg-[var(--theme-background)]">
          <pre className="text-xs font-mono whitespace-pre-wrap break-words">
            {String(diff)}
          </pre>
        </div>
      )}
    </div>
  );
}