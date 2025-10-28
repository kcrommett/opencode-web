import React, { useState } from "react";
import { useOpenCodeContext } from "@/contexts/OpenCodeContext";
import { Badge } from "./badge";
import { Button } from "./button";
import { Separator } from "./separator";
import { LspDiagnosticsSummary } from "@/types/opencode";

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
    
    const variant = severity === "errors" ? "error" : 
                   severity === "warnings" ? "warning" : 
                   severity === "infos" ? "info" : "background1";
    
    return (
      <Badge key={severity} variant={variant} cap="round">
        {count} {severity.slice(0, -1)}
      </Badge>
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
                  <Badge variant="error" cap="round">
                    {summary.errors} error{summary.errors !== 1 ? "s" : ""}
                  </Badge>
                )}
                {summary.warnings > 0 && (
                  <Badge variant="warning" cap="round">
                    {summary.warnings} warning{summary.warnings !== 1 ? "s" : ""}
                  </Badge>
                )}
                {summary.infos > 0 && (
                  <Badge variant="info" cap="round">
                    {summary.infos} info{summary.infos !== 1 ? "s" : ""}
                  </Badge>
                )}
                {summary.hints > 0 && (
                  <Badge variant="background1" cap="round">
                    {summary.hints} hint{summary.hints !== 1 ? "s" : ""}
                  </Badge>
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