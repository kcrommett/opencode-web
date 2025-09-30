import { useState } from 'react';
import type { Part } from "../../../../node_modules/@opencode-ai/sdk/dist/gen/types.gen";
import { Badge, Spinner } from '../ui';

interface ToolPartProps {
  part: Part;
  showDetails: boolean;
}

export function ToolPart({ part, showDetails }: ToolPartProps) {
  const [showInput, setShowInput] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  
  if (part.type !== 'tool') return null;
  
  const toolName = 'tool' in part ? part.tool : 'unknown';
  const state = 'state' in part ? part.state : { status: 'pending' };
  const status = state && typeof state === 'object' && 'status' in state ? state.status : 'pending';
  const input = 'input' in part ? part.input : undefined;
  const output = 'output' in part ? part.output : undefined;
  
  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Spinner size="small" />;
      case 'completed':
        return <span className="text-green-500">✅</span>;
      case 'error':
        return <span className="text-red-500">❌</span>;
      default:
        return <span className="opacity-50">⏳</span>;
    }
  };
  
  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'bg-blue-500/10 border-blue-500/30';
      case 'completed':
        return 'bg-green-500/10 border-green-500/30';
      case 'error':
        return 'bg-red-500/10 border-red-500/30';
      default:
        return 'bg-gray-500/10 border-gray-500/30';
    }
  };
  
  return (
    <div className={`border rounded-md overflow-hidden mb-2 ${getStatusColor()}`}>
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
        <div className="border-t border-[var(--theme-border)]">
          <div 
            className="px-3 py-2 cursor-pointer hover:bg-[var(--theme-backgroundAlt)] flex items-center justify-between"
            onClick={() => setShowInput(!showInput)}
          >
            <span className="text-xs font-medium opacity-70">Input {showInput ? '[-]' : '[+]'}</span>
          </div>
          {showInput && (
            <div className="px-3 pb-3">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-[var(--theme-background)] p-2 rounded">
                {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
      
      {output !== undefined && (
        <div className="border-t border-[var(--theme-border)]">
          <div 
            className="px-3 py-2 cursor-pointer hover:bg-[var(--theme-backgroundAlt)] flex items-center justify-between"
            onClick={() => setShowOutput(!showOutput)}
          >
            <span className="text-xs font-medium opacity-70">
              {status === 'error' ? 'Error' : 'Output'} {showOutput ? '[-]' : '[+]'}
            </span>
          </div>
          {showOutput && (
            <div className="px-3 pb-3">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-[var(--theme-background)] p-2 rounded">
                {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}