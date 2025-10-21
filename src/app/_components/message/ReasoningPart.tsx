import { useEffect, useMemo, useState } from 'react';
import type { Part } from '@/types/opencode';
import { Badge } from '../ui';

interface ReasoningPartProps {
  part: Part;
  showDetails: boolean;
}

const reasoningMetadataPriority = ['summary', 'thinking', 'text', 'content', 'details', 'explanation'];
type ReasoningSource = 'part' | 'metadata' | null;

function extractReadableString(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return '';
    const containsLetter = /[a-zA-Z]/.test(trimmed);
    const looksLikeSentence = trimmed.includes(' ');
    if (!containsLetter) return '';
    if (looksLikeSentence || trimmed.length > 40) {
      return value;
    }
    return '';
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const match = extractReadableString(item);
      if (match) return match;
    }
    return '';
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of reasoningMetadataPriority) {
      if (key in record) {
        const match = extractReadableString(record[key]);
        if (match) return match;
      }
    }
    for (const entry of Object.values(record)) {
      const match = extractReadableString(entry);
      if (match) return match;
    }
  }

  return '';
}

function extractReasoningText(part: Part): { text: string; source: ReasoningSource } {
  const rawText =
    typeof part.text === 'string'
      ? part.text
      : typeof part.content === 'string'
        ? part.content
        : typeof part.value === 'string'
          ? part.value
          : '';
  if (rawText.trim().length > 0) {
    return { text: rawText, source: 'part' };
  }

  const metadata = (part as { metadata?: unknown }).metadata;
  const metadataText = extractReadableString(metadata);
  if (metadataText) {
    return { text: metadataText, source: 'metadata' };
  }

  return { text: '', source: null };
}

export function ReasoningPart({ part, showDetails }: ReasoningPartProps) {
  const isReasoningPart = part.type === 'reasoning';
  const [isExpanded, setIsExpanded] = useState(showDetails);
  
  useEffect(() => {
    if (!isReasoningPart) return;
    setIsExpanded(showDetails);
  }, [isReasoningPart, showDetails]);

  const { text, source } = useMemo(() => extractReasoningText(part), [part]);
  const derivedFromMetadata = source === 'metadata';
  const hasReasoning = text.trim().length > 0;

  if (!isReasoningPart || !showDetails || !hasReasoning) return null;

  const toggle = () => {
    setIsExpanded((value) => !value);
  };

  const contentId = part.id ? `reasoning-${part.id}` : undefined;
  
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
          <span className="font-mono text-xs">THINK</span>
          <span className="text-sm font-medium">Thinking...</span>
          <span className="text-xs opacity-60">{isExpanded ? '[-]' : '[+]'}</span>
        </div>
        <Badge variant="foreground0" cap="round" className="text-xs">
          {text.length} chars
        </Badge>
      </button>
      {isExpanded && (
        <div
          id={contentId}
          className="border-t border-theme-border p-3 bg-theme-background"
        >
          <pre className="text-sm font-mono whitespace-pre-wrap break-words opacity-80">
            {text}
          </pre>
          {derivedFromMetadata && (
            <p className="mt-2 text-[11px] uppercase tracking-wide opacity-50">
              Derived from provider metadata
            </p>
          )}
        </div>
      )}
    </div>
  );
}
