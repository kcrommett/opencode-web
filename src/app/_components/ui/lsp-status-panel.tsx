import React, { useState } from "react";
import { useOpenCodeContext } from "@/contexts/OpenCodeContext";
import { Badge } from "./badge";
import { StatusBadge } from "./status-badge";
import { Button } from "./button";
import { Separator } from "./separator";

export const LspStatusPanel: React.FC = () => {
  const { sidebarStatus } = useOpenCodeContext();
  const { lspDiagnostics } = sidebarStatus;
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const isDevEnvironment = process.env.NODE_ENV !== "production";

  const diagnosticEntries = Object.entries(lspDiagnostics);
  
  if (diagnosticEntries.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">LSP Diagnostics</h3>
          <Button
            variant="foreground1"
            box="round"
            size="small"
            onClick={() => {
              if (isDevEnvironment) {
                console.log("Refreshing LSP diagnostics...");
              }
            }}
          >
            Refresh
          </Button>
        </div>
        <Separator />
        <div className="text-center text-sm text-theme-muted py-8">
          No diagnostics available
        </div>
      </div>
    );
  }

  const getTotalCounts = () => {
    return diagnosticEntries.reduce(
      (acc, [, summary]) => ({
        errors: acc.errors + summary.errors,
        warnings: acc.warnings + summary.warnings,
        infos: acc.infos + summary.infos,
        hints: acc.hints + summary.hints,
      }),
      { errors: 0, warnings: 0, infos: 0, hints: 0 }
    );
  };

  const totals = getTotalCounts();

  const getSeverityBadge = (count: number, severity: string) => {
    if (count === 0) return null;

    const statusMap: Record<string, "error" | "warning" | "info" | "pending"> = {
      errors: "error",
      warnings: "warning",
      infos: "info",
      hints: "pending",
    };

    const status = statusMap[severity] ?? "info";

    return (
      <StatusBadge key={severity} status={status}>
        {count} {severity.slice(0, -1)}
      </StatusBadge>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">LSP Diagnostics</h3>
        <Button
          variant="foreground1"
          box="round"
          size="small"
          onClick={() => {
            if (isDevEnvironment) {
              console.log("Refreshing LSP diagnostics...");
            }
          }}
        >
          Refresh
        </Button>
      </div>

      <Separator />

      {/* Summary */}
      <div className="space-y-2">
        <div className="text-xs text-theme-muted">Summary</div>
        <div className="flex flex-wrap gap-2">
          {getSeverityBadge(totals.errors, "errors")}
          {getSeverityBadge(totals.warnings, "warnings")}
          {getSeverityBadge(totals.infos, "infos")}
          {getSeverityBadge(totals.hints, "hints")}
        </div>
      </div>

      {/* Filter */}
      <div className="space-y-2">
        <div className="text-xs text-theme-muted">Filter</div>
        <div className="flex gap-1">
          {["all", "errors", "warnings", "infos", "hints"].map((filter) => (
            <Button
              key={filter}
              variant={filterSeverity === filter ? "foreground1" : "background1"}
              box="round"
              size="small"
              onClick={() => setFilterSeverity(filter)}
            >
              {filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Server Details */}
      <div className="space-y-3">
        {diagnosticEntries.map(([serverId, summary]) => {
          const shouldShow = filterSeverity === "all" || 
                           (filterSeverity === "errors" && summary.errors > 0) ||
                           (filterSeverity === "warnings" && summary.warnings > 0) ||
                           (filterSeverity === "infos" && summary.infos > 0) ||
                           (filterSeverity === "hints" && summary.hints > 0);

          if (!shouldShow) return null;

          return (
            <div
              key={serverId}
              className="p-3 rounded-lg bg-theme-background-alt space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{summary.label || serverId}</div>
                <Badge variant="background2" cap="round">
                  {new Date(summary.updatedAt).toLocaleTimeString()}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {summary.errors > 0 && (
                  <StatusBadge status="error">
                    {summary.errors} error{summary.errors !== 1 ? "s" : ""}
                  </StatusBadge>
                )}
                {summary.warnings > 0 && (
                  <StatusBadge status="warning">
                    {summary.warnings} warning{summary.warnings !== 1 ? "s" : ""}
                  </StatusBadge>
                )}
                {summary.infos > 0 && (
                  <StatusBadge status="info">
                    {summary.infos} info{summary.infos !== 1 ? "s" : ""}
                  </StatusBadge>
                )}
                {summary.hints > 0 && (
                  <StatusBadge status="pending">
                    {summary.hints} hint{summary.hints !== 1 ? "s" : ""}
                  </StatusBadge>
                )}
              </div>

              {summary.lastPath && (
                <div className="text-xs text-theme-muted truncate">
                  Last: {summary.lastPath}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filterSeverity !== "all" && (
        <div className="text-xs text-theme-muted text-center">
          Showing {filterSeverity} only
        </div>
      )}
    </div>
  );
};
