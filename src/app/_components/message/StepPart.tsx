import type { Part } from '@/types/opencode';
import { Badge } from '../ui';

interface StepPartProps {
  part: Part;
  showDetails: boolean;
}

export function StepPart({ part, showDetails }: StepPartProps) {
  if (part.type !== 'step-start' && part.type !== 'step-finish') return null;
  
  if (!showDetails) return null;
  
  const isStart = part.type === 'step-start';
  
  return (
    <div className="border-t border-theme-border my-2 py-2 opacity-50">
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="foreground0" cap="round">
          {isStart ? 'Step Start' : 'Step Complete'}
        </Badge>
      </div>
    </div>
  );
}
