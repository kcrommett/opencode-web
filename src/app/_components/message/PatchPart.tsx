import { useState } from 'react';
import type { Part } from '@/types/opencode';
import { Badge } from '../ui';

interface PatchPartProps {
  part: Part;
}

export function PatchPart({ part }: PatchPartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (part.type !== 'patch') return null;
  
  const rawDiff =
    typeof part.diff === 'string'
      ? part.diff
      : typeof part.content === 'string'
        ? part.content
        : '';
  const diff = rawDiff.trim().length > 0 ? rawDiff : '';

  const candidateFiles = (part as { files?: unknown }).files;
  const fileList = Array.isArray(candidateFiles)
    ? candidateFiles.map((file) => String(file))
    : [];

  const hasDiff = diff.trim().length > 0;
  const hasFiles = fileList.length > 0;
  const contentId = part.id ? `patch-${part.id}` : undefined;

  const toggle = () => {
    setIsExpanded((value) => !value);
  };
  
  return (
    <div className="border border-theme-border rounded-md overflow-hidden bg-theme-background-alt mb-2">
      <button
        type="button"
        className="flex w-full items-center justify-between p-3 text-left hover:bg-theme-background transition-colors"
        onClick={toggle}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">PATCH</span>
          <span className="text-sm font-medium">File Changes</span>
          <span className="text-xs opacity-60">{isExpanded ? '[-]' : '[+]'}</span>
        </div>
        {(hasFiles || hasDiff) && (
          <Badge variant="foreground0" cap="round" className="text-xs">
            {hasFiles ? `${fileList.length} ${fileList.length === 1 ? 'file' : 'files'}` : `${diff.length} chars`}
          </Badge>
        )}
      </button>
      {isExpanded && (
        <div
          id={contentId}
          className="border-t border-theme-border p-3 bg-theme-background space-y-2"
        >
          {hasDiff && (
            <pre className="text-xs font-mono whitespace-pre-wrap break-words">
              {diff}
            </pre>
          )}
          {!hasDiff && hasFiles && (
            <ul className="text-xs font-mono leading-relaxed opacity-80">
              {fileList.map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ul>
          )}
          {!hasDiff && !hasFiles && (
            <p className="text-xs opacity-70">
              No file diff details were returned for this message.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
