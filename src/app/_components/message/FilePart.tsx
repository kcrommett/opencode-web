import type { Part } from '@/types/opencode';
import { Badge } from '../ui';

interface FilePartProps {
  part: Part;
}

export function FilePart({ part }: FilePartProps) {
  if (part.type !== 'file') return null;
  
  const path = 'path' in part ? part.path : '';
  const size = 'size' in part && typeof part.size === 'number' ? part.size : undefined;
  
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  return (
    <div className="border border-theme-border rounded-md p-3 bg-theme-background-alt mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">FILE</span>
          <span className="text-sm font-medium">{String(path || 'Unknown file')}</span>
        </div>
        {size !== undefined && (
          <Badge variant="foreground0" cap="round" className="text-xs">
            {formatSize(size)}
          </Badge>
        )}
      </div>
    </div>
  );
}
