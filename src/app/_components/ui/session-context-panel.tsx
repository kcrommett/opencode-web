import React from "react";
import { useOpenCodeContext } from "@/contexts/OpenCodeContext";
import { Badge } from "./badge";
import { StatusBadge } from "./status-badge";
import { Button } from "./button";
import { Separator } from "./separator";

export const SessionContextPanel: React.FC = () => {
  const { 
    sidebarStatus, 
    currentSession, 
    sseConnectionState,
    sessionUsage 
  } = useOpenCodeContext();

  const { sessionContext } = sidebarStatus;
  const isDevEnvironment = process.env.NODE_ENV !== "production";

  if (!currentSession && !sessionContext.id) {
    return (
      <div className="p-4 text-center text-sm text-theme-muted">
        No active session
      </div>
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

  const getConnectionStatus = () => {
    switch (sseConnectionState) {
      case "connected":
        return { status: "success" as const, label: "Connected" };
      case "connecting":
        return { status: "pending" as const, label: "Connecting" };
      case "disconnected":
        return { status: "error" as const, label: "Disconnected" };
      default:
        return { status: "info" as const, label: "Unknown" };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Session Context</h3>
        <Button
          variant="foreground1"
          box="round"
          size="small"
          onClick={() => {
            if (isDevEnvironment) {
              console.log("Refreshing session context...");
            }
          }}
        >
          Refresh
        </Button>
      </div>

      <Separator />

      <div className="space-y-3">
        {/* Session ID and Title */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-theme-muted">ID:</span>
            <Badge variant="background1" cap="round">
              {sessionContext.id || "N/A"}
            </Badge>
          </div>
          {sessionContext.title && (
            <div className="text-sm font-medium truncate">
              {sessionContext.title}
            </div>
          )}
        </div>

        {/* Model and Agent Info */}
        <div className="space-y-2">
          {sessionContext.modelId && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-theme-muted">Model:</span>
              <Badge variant="background2" cap="round">
                {sessionContext.modelId}
              </Badge>
            </div>
          )}
          {sessionContext.agentName && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-theme-muted">Agent:</span>
              <Badge variant="background2" cap="round">
                {sessionContext.agentName}
              </Badge>
            </div>
          )}
        </div>

        {/* Message Count and Token Usage */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="text-xs text-theme-muted">Messages</div>
            <Badge variant="background1" cap="round">
              {sessionContext.messageCount}
            </Badge>
          </div>
          {sessionUsage && (
            <div className="space-y-1">
              <div className="text-xs text-theme-muted">Tokens</div>
              <Badge variant="background1" cap="round">
                {sessionUsage.total_tokens || 0}
              </Badge>
            </div>
          )}
        </div>

        {/* Session Duration */}
        {(sessionContext.activeSince || sessionContext.lastActivity) && (
          <div className="space-y-1">
            <div className="text-xs text-theme-muted">Duration</div>
            <Badge variant="background2" cap="round">
              {formatDuration(sessionContext.activeSince, sessionContext.lastActivity)}
            </Badge>
          </div>
        )}

        {/* SSE Connection Status */}
        <div className="space-y-1">
          <div className="text-xs text-theme-muted">Connection</div>
          <StatusBadge status={connectionStatus.status}>
            {connectionStatus.label}
          </StatusBadge>
        </div>

        {/* Last Error */}
        {sessionContext.lastError && (
          <div className="space-y-1">
            <div className="text-xs text-theme-muted">Last Error</div>
            <StatusBadge status="error">
              {sessionContext.lastError}
            </StatusBadge>
          </div>
        )}

        {/* Streaming Status */}
        {sessionContext.isStreaming && (
          <StatusBadge status="info">
            Streaming...
          </StatusBadge>
        )}
      </div>
    </div>
  );
};