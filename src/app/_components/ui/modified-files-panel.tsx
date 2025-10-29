import React, { useState } from "react";
import { useOpenCodeContext } from "@/contexts/OpenCodeContext";
import { Badge } from "./badge";
import { StatusBadge } from "./status-badge";
import { Button } from "./button";
import { Separator } from "./separator";

export const ModifiedFilesPanel: React.FC = () => {
  const { sidebarStatus, refreshGitStatus } = useOpenCodeContext();
  const { gitStatus } = sidebarStatus;
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["modified", "staged", "untracked"]));
  const isDevEnvironment = process.env.NODE_ENV !== "production";

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const hasChanges = gitStatus.staged.length > 0 || 
                    gitStatus.modified.length > 0 || 
                    gitStatus.untracked.length > 0 || 
                    gitStatus.deleted.length > 0;

  const getFileCount = (count: number, label: string) => {
    if (count === 0) return null;
    return (
      <Badge key={label} variant="background1" cap="square">
        {count} {label}
      </Badge>
    );
  };

  const renderFileSection = (title: string, files: string[], sectionKey: string) => {
    if (files.length === 0) return null;

    const isExpanded = expandedSections.has(sectionKey);
    return (
      <div className="space-y-2">
        <div 
          className="flex items-center justify-between cursor-pointer hover:bg-theme-background-alt rounded p-2"
          onClick={() => toggleSection(sectionKey)}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{title}</span>
            <Badge variant="background2" cap="square">
              {files.length}
            </Badge>
          </div>
          <span className="text-xs text-theme-muted">
            {isExpanded ? "▼" : "▶"}
          </span>
        </div>
        
        {isExpanded && (
          <div className="pl-4 space-y-1">
            {files.map((file) => (
              <div key={file} className="text-xs text-theme-muted truncate">
                {file}
              </div>
            ))}
          </div>
        )}
        
        {!isExpanded && files.length > 5 && (
          <div className="pl-4 text-xs text-theme-muted">
            ...and {files.length - 5} more
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Modified Files</h3>
        <Button
          variant="foreground1"
          box="round"
          size="small"
          onClick={() => {
            if (isDevEnvironment) {
              console.log("Refreshing git status...");
            }
            refreshGitStatus();
          }}
        >
          Refresh
        </Button>
      </div>

      <Separator />

      {/* Branch Info */}
      {gitStatus.branch && (
        <div className="space-y-2">
          <div className="text-xs text-theme-muted">Branch</div>
          <div className="flex items-center gap-2">
            <Badge variant="background1" cap="square">
              {gitStatus.branch}
            </Badge>
            {gitStatus.ahead && gitStatus.ahead > 0 && (
              <StatusBadge status="success">
                ↑{gitStatus.ahead}
              </StatusBadge>
            )}
            {gitStatus.behind && gitStatus.behind > 0 && (
              <StatusBadge status="warning">
                ↓{gitStatus.behind}
              </StatusBadge>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      {hasChanges && (
        <div className="space-y-2">
          <div className="text-xs text-theme-muted">Summary</div>
          <div className="flex flex-wrap gap-2">
            {getFileCount(gitStatus.staged.length, "staged")}
            {getFileCount(gitStatus.modified.length, "modified")}
            {getFileCount(gitStatus.untracked.length, "untracked")}
            {getFileCount(gitStatus.deleted.length, "deleted")}
          </div>
        </div>
      )}

      <Separator />

      {/* File Lists */}
      {!hasChanges ? (
        <div className="text-center text-sm text-theme-muted py-8">
          No changes detected
        </div>
      ) : (
        <div className="space-y-4">
          {renderFileSection("Staged Files", gitStatus.staged, "staged")}
          {renderFileSection("Modified Files", gitStatus.modified, "modified")}
          {renderFileSection("Untracked Files", gitStatus.untracked, "untracked")}
          {renderFileSection("Deleted Files", gitStatus.deleted, "deleted")}
        </div>
      )}

      <div className="text-xs text-theme-muted text-center">
        Last updated: {new Date(gitStatus.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};
