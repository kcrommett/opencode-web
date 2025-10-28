import React from "react";
import { useOpenCodeContext } from "@/contexts/OpenCodeContext";
import { Badge } from "./badge";
import { StatusBadge } from "./status-badge";
import { Button } from "./button";
import { Separator } from "./separator";
import { Spinner } from "./spinner";

export const McpStatusPanel: React.FC = () => {
  const { sidebarStatus, refreshMcpStatus } = useOpenCodeContext();
  const { mcpServers } = sidebarStatus;
  const isDevEnvironment = process.env.NODE_ENV !== "production";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "success" as const;
      case "connecting":
        return "pending" as const;
      case "error":
        return "error" as const;
      case "disconnected":
      default:
        return "warning" as const;
    }
  };

  const handleRefresh = async () => {
    if (isDevEnvironment) {
      console.log("Refreshing MCP status...");
    }
    await refreshMcpStatus();
  };

  if (mcpServers.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">MCP Servers</h3>
          <Button
            variant="foreground1"
            box="round"
            size="small"
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </div>
        <Separator />
        <div className="text-center text-sm text-theme-muted py-8">
          No MCP servers configured
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">MCP Servers</h3>
        <Button
          variant="foreground1"
          box="round"
          size="small"
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </div>

      <Separator />

      <div className="space-y-3">
        {mcpServers.map((server) => (
          <div
            key={server.id}
            className="p-3 rounded-lg bg-theme-background-alt space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={getStatusColor(server.status)}>
                  {server.status}
                </StatusBadge>
                <span className="text-sm font-medium">{server.name}</span>
              </div>
              <Badge variant="background2" cap="round">
                {new Date(server.lastChecked).toLocaleTimeString()}
              </Badge>
            </div>
            
            {server.description && (
              <div className="text-xs text-theme-muted">
                {server.description}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs text-theme-muted text-center">
        {mcpServers.length} server{mcpServers.length !== 1 ? "s" : ""} monitored
      </div>
    </div>
  );
};