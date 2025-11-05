import React from "react";
import type { McpServerStatus } from "@/types/opencode";

const STATUS_PRIORITY: Record<McpServerStatus, number> = {
  connected: 0,
  failed: 1,
};

interface McpStatusProps {
  mcpStatus: Record<string, McpServerStatus> | null;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  showLabel?: boolean;
}

export const McpStatus: React.FC<McpStatusProps> = ({
  mcpStatus,
  isLoading = false,
  error = null,
  className = "",
  showLabel = true,
}) => {
  if (isLoading) {
    return (
      <div className={`mcp-status-loading ${className}`}>
        {showLabel && <span className="mcp-status-label">MCP Servers:</span>}
        <span className="mcp-status-text">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`mcp-status-error ${className}`}>
        {showLabel && <span className="mcp-status-label">MCP Servers:</span>}
        <span className="mcp-status-text text-red-500">Unable to load status</span>
      </div>
    );
  }

  if (!mcpStatus || Object.keys(mcpStatus).length === 0) {
    return (
      <div className={`mcp-status-empty ${className}`}>
        {showLabel && <span className="mcp-status-label">MCP Servers:</span>}
        <span className="mcp-status-text">None configured</span>
      </div>
    );
  }

  const getStatusDotClass = (status: McpServerStatus): string => {
    switch (status) {
      case "connected":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-theme-border";
    }
  };

  return (
    <div className={`mcp-status-container ${className}`}>
      {showLabel && <span className="mcp-status-label">MCP Servers:</span>}
      <div className="mcp-status-list">
        {Object.entries(mcpStatus)
          .sort(([nameA, statusA], [nameB, statusB]) => {
            const priorityComparison =
              STATUS_PRIORITY[statusA] - STATUS_PRIORITY[statusB];
            if (priorityComparison !== 0) {
              return priorityComparison;
            }
            return nameA.localeCompare(nameB);
          })
          .map(([name, status]) => (
          <div
            key={name}
            className="mcp-status-item flex items-center gap-2"
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${getStatusDotClass(status)}`}
              aria-hidden="true"
            />
            <span className="mcp-server-name">{name}</span>
            <span className="sr-only">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default McpStatus;
