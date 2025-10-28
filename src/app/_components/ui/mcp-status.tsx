import React from "react";
import { StatusBadge } from "./status-badge";
import type { McpServerStatus } from "@/types/opencode";

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
        <StatusBadge status="error">Error</StatusBadge>
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

  const getStatusBadgeType = (
    status: McpServerStatus,
  ): "success" | "warning" | "error" => {
    switch (status) {
      case "connected":
        return "success";
      case "disabled":
        return "warning";
      case "failed":
        return "error";
    }
  };

  return (
    <div className={`mcp-status-container ${className}`}>
      {showLabel && <span className="mcp-status-label">MCP Servers:</span>}
      <div className="mcp-status-list">
        {Object.entries(mcpStatus).map(([name, status]) => (
          <div key={name} className="mcp-status-item">
            <span className="mcp-server-name">{name}</span>
            <StatusBadge status={getStatusBadgeType(status)} cap="round">
              {status}
            </StatusBadge>
          </div>
        ))}
      </div>
    </div>
  );
};

export default McpStatus;
