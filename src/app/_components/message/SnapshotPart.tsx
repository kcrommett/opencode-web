import type { Part } from '@/types/opencode';
import { Badge } from '../ui';

interface SnapshotPartProps {
  part: Part;
}

export function SnapshotPart({ part }: SnapshotPartProps) {
  if (part.type !== 'snapshot') return null;
  
  return (
    <div className="flex items-center gap-2 my-2 opacity-50">
      <Badge variant="foreground0" cap="round" className="text-xs">
        Snapshot Created
      </Badge>
    </div>
  );
}
