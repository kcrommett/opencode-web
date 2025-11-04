import React, { useMemo } from "react";
import { useOpenCodeContext } from "@/contexts/OpenCodeContext";
import { Badge } from "./badge";
import { StatusBadge } from "./status-badge";
import { Button } from "./button";
import { Separator } from "./separator";

export const SessionContextPanel: React.FC = () => {
  const { sidebarStatus, currentSession, sseConnectionState } = useOpenCodeContext();
  const { sessionContext } = sidebarStatus;

  const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);
  const formatNumber = (value?: number) =>
    typeof value === "number" && Number.isFinite(value)
      ? numberFormatter.format(value)
      : "—";
  const tokenChipClass =
    "inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium uppercase tracking-wide";
  const metaBadgeClass =
    "inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium tracking-wide";

  const tokensUsed =
    sessionContext.tokensUsed ?? sessionContext.tokenUsage?.totalTokens ?? 0;
  const inputTokens =
    sessionContext.inputTokens ?? sessionContext.tokenUsage?.input ?? 0;
  const outputTokens =
    sessionContext.outputTokens ?? sessionContext.tokenUsage?.output ?? 0;
  const reasoningTokens =
    sessionContext.reasoningTokens ?? sessionContext.tokenUsage?.reasoning ?? 0;
  const cacheRead =
    sessionContext.cacheTokens?.read ?? sessionContext.tokenUsage?.cacheRead ?? 0;
  const cacheWrite =
    sessionContext.cacheTokens?.write ?? sessionContext.tokenUsage?.cacheWrite ?? 0;
  const hasDuration = Boolean(sessionContext.activeSince || sessionContext.lastActivity);

  const connectionStatus = useMemo(() => {
    if (!sseConnectionState) {
      return { status: "info" as const, label: "Unknown" };
    }
    if (sseConnectionState.error) {
      return { status: "error" as const, label: "Error" };
    }
    if (sseConnectionState.reconnecting) {
      return { status: "pending" as const, label: "Reconnecting" };
    }
    if (sseConnectionState.connected) {
      return { status: "success" as const, label: "Connected" };
    }
    return { status: "warning" as const, label: "Disconnected" };
  }, [sseConnectionState]);

  if (!currentSession && !sessionContext.id) {
    return (
      <div className="p-4 text-center text-sm text-theme-muted">No active session</div>
    );
  }

  const formatDuration = (start?: Date, end?: Date): string => {
    if (!start) return "N/A";
    const endTime = end || new Date();
    const diff = endTime.getTime() - start.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const handleCopySessionId = () => {
    if (!sessionContext.id || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    navigator.clipboard
      .writeText(sessionContext.id)
      .catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to copy session ID:", error);
        }
      });
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Session Context</h3>
        <Button
          variant="foreground1"
          box="round"
          size="small"
          onClick={handleCopySessionId}
          disabled={!sessionContext.id}
        >
          Copy ID
        </Button>
      </div>

      <Separator />

      <div className="space-y-3">
        {/* Session ID and Title */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-theme-muted">ID:</span>
            <Badge variant="background1" cap="square">
              {sessionContext.id || "N/A"}
            </Badge>
          </div>
          {(sessionContext.title || currentSession?.title) && (
            <div 
              className="text-sm font-medium truncate"
              title={sessionContext.title ?? currentSession?.title}
            >
              {sessionContext.title ?? currentSession?.title}
            </div>
          )}
        </div>

        {/* Model and Agent Info */}
        <div className="space-y-2 text-sm">
          {(sessionContext.modelName || sessionContext.modelId) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-theme-muted">Model:</span>
              <Badge variant="background2" cap="square">
                {sessionContext.modelName ?? sessionContext.modelId}
              </Badge>
            </div>
          )}
          {sessionContext.agentName && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-theme-muted">Agent:</span>
              <Badge variant="background2" cap="square">
                {sessionContext.agentName}
              </Badge>
            </div>
          )}
        </div>

        {/* Core Metrics */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="space-y-1">
            <div className="text-xs text-theme-muted">Messages</div>
            <Badge variant="background1" cap="square">
              {formatNumber(sessionContext.messageCount)}
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-theme-muted">Tokens Used</div>
            <Badge variant="background1" cap="square">
              {formatNumber(tokensUsed)}
            </Badge>
          </div>
        </div>

        {/* Token Breakdown */}
        <div className="space-y-1">
          <div className="text-xs text-theme-muted">Token Breakdown</div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="background2" cap="square" className={tokenChipClass}>
              IN {formatNumber(inputTokens)}
            </Badge>
            <Badge variant="background2" cap="square" className={tokenChipClass}>
              OUT {formatNumber(outputTokens)}
            </Badge>
            <Badge variant="background2" cap="square" className={tokenChipClass}>
              REASON {formatNumber(reasoningTokens)}
            </Badge>
            <Badge variant="background2" cap="square" className={tokenChipClass}>
              CACHE {formatNumber(cacheRead)}/{formatNumber(cacheWrite)}
            </Badge>
          </div>
        </div>

        {/* Meta Row */}
        <div className="flex flex-wrap items-center gap-2">
          {hasDuration && (
            <Badge variant="background2" cap="square" className={metaBadgeClass}>
              DUR {formatDuration(sessionContext.activeSince, sessionContext.lastActivity)}
            </Badge>
          )}
          <StatusBadge status={connectionStatus.status} className={metaBadgeClass}>
            {connectionStatus.label}
          </StatusBadge>
          {sessionContext.isStreaming && (
            <StatusBadge status="info" className={metaBadgeClass}>
              Streaming…
            </StatusBadge>
          )}
        </div>

        {sessionContext.lastError && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-theme-muted">
            <span>Last Error</span>
            <StatusBadge status="error" className={metaBadgeClass}>
              {sessionContext.lastError}
            </StatusBadge>
          </div>
        )}
      </div>
    </div>
  );
};
