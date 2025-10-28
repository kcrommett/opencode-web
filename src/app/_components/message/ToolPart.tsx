import { useState } from "react";
import type { Part } from "@/types/opencode";
import { Badge, Button, Spinner } from "../ui";
import {
  normalizeToolPart,
  TOOL_STATUS_LABELS,
  formatDuration,
} from "@/lib/tool-helpers";

interface ToolPartProps {
  part: Part;
  showDetails: boolean;
}

export function ToolPart({ part, showDetails }: ToolPartProps) {
  const [showInput, setShowInput] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (part.type !== "tool") return null;

  const normalized = normalizeToolPart(part);
  const { tool, status, input, output, error, state, path } = normalized;

  const statusLabel = TOOL_STATUS_LABELS[status] || status;
  const duration = state?.timings?.duration;

  const getStatusIcon = () => {
    switch (status) {
      case "running":
        return <Spinner size="small" />;
      case "completed":
        return <span className="text-theme-success font-bold">✓</span>;
      case "error":
        return <span className="text-theme-error font-bold">✗</span>;
      default:
        return <span className="opacity-50">◦</span>;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "running":
        return "status-card running";
      case "completed":
        return "status-card completed";
      case "error":
        return "status-card error";
      default:
        return "status-card pending";
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatPayload = (payload: unknown): string => {
    if (typeof payload === "string") {
      return payload;
    }
    return JSON.stringify(payload, null, 2);
  };

  return (
    <div className={getStatusColor()}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getStatusIcon()}
          <span className="font-medium text-sm truncate">{tool}</span>
          <Badge variant="foreground0" cap="round" className="text-xs shrink-0">
            {statusLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs opacity-70 shrink-0">
          {path && (
            <span className="font-mono truncate max-w-[200px] sm:max-w-xs" title={path}>
              {path.split("/").pop()}
            </span>
          )}
          {duration !== undefined && (
            <span className="font-mono">{formatDuration(duration)}</span>
          )}
        </div>
      </div>

      {/* Input Section */}
      {showDetails && input !== undefined && (
        <div className="border-t border-theme-border">
          <Button
            variant="background2"
            className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-theme-background-alt transition-colors"
            onClick={() => setShowInput(!showInput)}
            aria-expanded={showInput}
          >
            <span className="text-xs font-medium opacity-70">
              Input {showInput ? "▼" : "▶"}
            </span>
            <Button
              variant="background3"
              size="small"
              className="text-xs opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(formatPayload(input), "input");
              }}
              title="Copy input"
            >
              {copiedField === "input" ? "✓" : "⧉"}
            </Button>
          </Button>
          {showInput && (
            <div className="px-3 pb-3">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-theme-background p-2 rounded max-h-[400px] overflow-auto">
                {formatPayload(input)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Output/Error Section */}
      {(output !== undefined || error) && (
        <div className="border-t border-theme-border">
          <Button
            variant="background2"
            className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-theme-background-alt transition-colors"
            onClick={() => setShowOutput(!showOutput)}
            aria-expanded={showOutput}
          >
            <span className="text-xs font-medium opacity-70">
              {status === "error" ? "Error" : "Output"} {showOutput ? "▼" : "▶"}
            </span>
            <Button
              variant="background3"
              size="small"
              className="text-xs opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                const text = error?.message || formatPayload(output);
                copyToClipboard(text, "output");
              }}
              title="Copy output"
            >
              {copiedField === "output" ? "✓" : "⧉"}
            </Button>
          </Button>
          {showOutput && (
            <div className="px-3 pb-3">
              {error?.message ? (
                <div className="space-y-2">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-theme-background p-2 rounded text-theme-error">
                    {error.message}
                  </pre>
                  {error.stack && (
                    <details className="text-xs">
                      <summary className="cursor-pointer opacity-70 hover:opacity-100">
                        Stack trace
                      </summary>
                      <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-theme-background p-2 rounded mt-2 opacity-70">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              ) : (
                <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-theme-background p-2 rounded max-h-[400px] overflow-auto">
                  {formatPayload(output)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
