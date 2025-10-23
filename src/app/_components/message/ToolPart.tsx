import { useState } from 'react';
import type { Part } from '@/types/opencode';
import { Badge, Spinner } from '../ui';

interface ToolPartProps {
  part: Part;
  showDetails: boolean;
}

export function ToolPart({ part, showDetails }: ToolPartProps) {
  const [showInput, setShowInput] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  
  if (part.type !== 'tool') return null;
  
  const toolName = typeof part.tool === 'string' ? part.tool : 'unknown';
  const state = (part as { state?: { status?: unknown } }).state;
  const status =
    typeof part.status === 'string'
      ? part.status
      : state && typeof state === 'object' && typeof (state as { status?: unknown }).status === 'string'
        ? ((state as { status: string }).status)
        : 'pending';
  const input = (part as { input?: unknown }).input;
  const output = (part as { output?: unknown }).output;
  
  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Spinner size="small" />;
      case 'completed':
        return <span className="text-theme-success font-bold">OK</span>;
      case 'error':
        return <span className="text-theme-error font-bold">ERR</span>;
      default:
        return <span className="opacity-50">...</span>;
    }
  };
  
  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'status-card running';
      case 'completed':
        return 'status-card completed';
      case 'error':
        return 'status-card error';
      default:
        return 'status-card';
    }
  };
  
  return (
    <div className={getStatusColor()}>
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-sm">{toolName}</span>
          <Badge variant="foreground0" cap="round" className="text-xs">
            {status}
          </Badge>
        </div>
      </div>
      
      {showDetails && input !== undefined && (
        <div className="border-t border-theme-border">
          <div 
            className="px-3 py-2 cursor-pointer hover:bg-theme-background-alt flex items-center justify-between"
            onClick={() => setShowInput(!showInput)}
          >
            <span className="text-xs font-medium opacity-70">Input {showInput ? '[-]' : '[+]'}</span>
          </div>
          {showInput && (
            <div className="px-3 pb-3">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-theme-background p-2 rounded">
                {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
      
      {output !== undefined && (
        <div className="border-t border-theme-border">
          <div 
            className="px-3 py-2 cursor-pointer hover:bg-theme-background-alt flex items-center justify-between"
            onClick={() => setShowOutput(!showOutput)}
          >
            <span className="text-xs font-medium opacity-70">
              {status === 'error' ? 'Error' : 'Output'} {showOutput ? '[-]' : '[+]'}
            </span>
          </div>
          {showOutput && (
            <div className="px-3 pb-3">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-theme-background p-2 rounded">
                {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
