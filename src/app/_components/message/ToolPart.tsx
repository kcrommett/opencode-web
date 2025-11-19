import { useCallback, useMemo, useState } from "react";
import type { Part, PermissionResponse } from "@/types/opencode";
import { Badge, Button, Spinner } from "../ui";
import { PermissionCard } from "../ui/permission-card";
import { useOpenCodeContext } from "@/contexts/OpenCodeContext";
import {
  normalizeToolPart,
  TOOL_STATUS_LABELS,
  formatDuration,
  getPermissionForPart,
} from "@/lib/tool-helpers";
import { DiffPart } from "./DiffPart";
import { useIsMobile } from "@/lib/breakpoints";

const SHELL_TOOL_NAMES = new Set(["shell", "bash", "sh", "zsh", "fish"]);

interface ToolPartProps {
  part: Part;
  showDetails: boolean;
}

export function ToolPart({ part, showDetails }: ToolPartProps) {
  const isMobile = useIsMobile();
  const [showInput, setShowInput] = useState(false);
  const [showOutput, setShowOutput] = useState(() => !isMobile);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const {
    permissionQueue,
    currentSession,
    respondToPermission,
    removePermission,
  } = useOpenCodeContext();

  if (part.type !== "tool") return null;

  const normalized = normalizeToolPart(part);
  const { tool, status, input, output, error, state, path, diff, metadata } =
    normalized;

  const resolvedPath =
    typeof path === "string" && path.trim().length > 0 ? path.trim() : undefined;
  const isShellTool =
    typeof tool === "string" && SHELL_TOOL_NAMES.has(tool.toLowerCase());
  const shouldShowPath =
    resolvedPath && !isShellTool ? resolvedPath.trim().length > 0 : false;
  const fileName = shouldShowPath
    ? resolvedPath?.split(/[\\/]/).filter(Boolean).pop() ?? resolvedPath
    : undefined;

  const getString = (value: unknown): string | undefined => {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    return undefined;
  };

  const extractCommandFromInput = (value: unknown): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "string") {
      return value.trim();
    }
    if (typeof value === "object" && "command" in (value as Record<string, unknown>)) {
      return getString((value as Record<string, unknown>).command);
    }
    return undefined;
  };

  const metadataRecord = (metadata ?? undefined) as
    | Record<string, unknown>
    | undefined;

  const commandText =
    extractCommandFromInput(input) ||
    (metadataRecord ? getString(metadataRecord["command"]) : undefined) ||
    (metadataRecord ? getString(metadataRecord["cmd"]) : undefined);

  const workingDirectory =
    (metadataRecord ? getString(metadataRecord["cwd"]) : undefined) ||
    (metadataRecord ? getString(metadataRecord["workingDirectory"]) : undefined) ||
    (metadataRecord ? getString(metadataRecord["directory"]) : undefined);

  const exitCode = metadataRecord
    ? typeof metadataRecord["exitCode"] === "number"
      ? (metadataRecord["exitCode"] as number)
      : typeof metadataRecord["statusCode"] === "number"
        ? (metadataRecord["statusCode"] as number)
        : typeof metadataRecord["code"] === "number"
          ? (metadataRecord["code"] as number)
          : undefined
    : undefined;

  const pendingPermission = useMemo(
    () => getPermissionForPart(part, permissionQueue),
    [part, permissionQueue],
  );

  const showPermissionCard = Boolean(pendingPermission);
  const isAwaitingPermission = pendingPermission?.status === "pending";

  const handlePermissionResponse = useCallback(
    async (responseValue: PermissionResponse) => {
      if (!pendingPermission?.id) {
        throw new Error("Permission context unavailable.");
      }
      if (!currentSession?.id) {
        throw new Error("No active session available.");
      }

      await respondToPermission(
        currentSession.id,
        pendingPermission.id,
        responseValue,
      );
    },
    [currentSession?.id, pendingPermission?.id, respondToPermission],
  );

  const handlePermissionDismiss = useCallback(() => {
    if (!pendingPermission?.id) {
      return;
    }
    removePermission(pendingPermission.id);
  }, [pendingPermission?.id, removePermission]);
 
  const statusLabel = TOOL_STATUS_LABELS[status] || status;

  const headerLabel = commandText ? `$ ${commandText}` : tool;
  const shouldShowInputSection = showDetails && input !== undefined && !commandText;

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
    if (payload === undefined || payload === null) {
      return "";
    }
    if (typeof payload === "string") {
      return payload;
    }
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  };

  return (
    <div className={getStatusColor()}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getStatusIcon()}
          <span className="font-medium text-sm truncate">{headerLabel}</span>
          <Badge variant="foreground0" cap="square" className="text-xs shrink-0">
            {statusLabel}
          </Badge>
          {isAwaitingPermission && (
            <Badge variant="warning" cap="square" className="text-xs shrink-0">
              Awaiting permission
            </Badge>
          )}
        </div>
      <div className="flex items-center gap-2 text-xs opacity-70 shrink-0">
        {shouldShowPath && fileName && (
          <span
            className="font-mono truncate max-w-[200px] sm:max-w-xs"
            title={resolvedPath}
          >
            {fileName}
          </span>
        )}
        {duration !== undefined && (
          <span className="font-mono">{formatDuration(duration)}</span>
        )}
      </div>
    </div>

    {showPermissionCard && pendingPermission && (
      <div className="border-t border-theme-border bg-theme-background-alt/40 px-3 py-3">
        <PermissionCard
          permission={pendingPermission}
          onRespond={handlePermissionResponse}
          onDismiss={handlePermissionDismiss}
        />
      </div>
    )}
 
    {(workingDirectory || exitCode !== undefined) && (

        <div className="px-3 py-2 text-xs border-t border-theme-border bg-theme-background-alt/40 space-y-1">
          {workingDirectory && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="opacity-70">Dir</span>
              <code className="font-mono break-all text-theme-foreground">
                {workingDirectory}
              </code>
            </div>
          )}
          {exitCode !== undefined && (
            <div className="flex items-center gap-2">
              <span className="opacity-70">Exit</span>
              <Badge
                variant={exitCode === 0 ? "background2" : "foreground0"}
                cap="square"
                className="text-xs"
              >
                {exitCode}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Input Section */}
      {shouldShowInputSection && (
        <div className="border-t border-theme-border">
          <div
            role="button"
            tabIndex={0}
            className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-theme-background-alt transition-colors cursor-pointer"
            onClick={() => setShowInput(!showInput)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowInput((v) => !v);
              }
            }}
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
          </div>
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
          <div
            role="button"
            tabIndex={0}
            className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-theme-background-alt transition-colors cursor-pointer"
            onClick={() => setShowOutput(!showOutput)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowOutput((v) => !v);
              }
            }}
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
          </div>
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

      {/* Diff Section */}
      {diff && (
        <div className="border-t border-theme-border">
          <div className="p-2">
            <DiffPart diff={diff} toolName={tool} />
          </div>
        </div>
      )}
    </div>
  );
}
