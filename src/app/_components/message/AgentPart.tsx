import type { Part } from '@/types/opencode';
import { Badge } from '../ui';

interface AgentPartProps {
  part: Part;
}

export function AgentPart({ part }: AgentPartProps) {
  if (part.type !== 'agent') return null;
  
  const agentName = 'name' in part ? part.name : 'Unknown Agent';
  
  return (
    <div className="flex items-center gap-2 my-2">
      <Badge variant="foreground0" cap="round" className="text-xs">
        Agent: {String(agentName || 'Unknown')}
      </Badge>
    </div>
  );
}
