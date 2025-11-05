import React, { useMemo } from "react";
import { useOpenCodeContext } from "@/contexts/OpenCodeContext";
import { Button } from "./button";
import { McpStatus } from "./mcp-status";

export const McpStatusPanel: React.FC = () => {
  const { sidebarStatus, refreshMcpStatus } = useOpenCodeContext();
  const { mcpStatus, mcpStatusLoading, mcpStatusError } = sidebarStatus;

  const handleRefresh = async () => {
    await refreshMcpStatus();
  };

  const summary = useMemo(() => {
    const entries = Object.values(mcpStatus ?? {});
    const connected = entries.filter((status) => status === "connected").length;
    const failed = entries.filter((status) => status === "failed").length;
    return {
      connected,
      failed,
    };
  }, [mcpStatus]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
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

      <McpStatus
        mcpStatus={mcpStatus}
        isLoading={mcpStatusLoading}
        error={mcpStatusError}
        showLabel={false}
      />

      <div className="flex items-center justify-center gap-4 text-xs text-theme-muted">
        <span>{summary.connected} connected</span>
        <span>{summary.failed} failed</span>
      </div>
    </div>
  );
};
