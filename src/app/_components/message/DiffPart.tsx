import { useState, useMemo } from "react";
import type { DiffMetadata } from "@/types/opencode";
import { Badge, Button } from "../ui";
import { parseDiff, formatDiffStats, isDiffTooLarge } from "@/lib/diff-utils";
import type { DiffFile } from "@/lib/diff-utils";
import { PrettyDiff } from "./PrettyDiff";

interface DiffPartProps {
  diff: DiffMetadata;
  toolName?: string;
  hideHeader?: boolean;
}

interface DiffFileViewProps {
  file: DiffFile;
  isExpanded: boolean;
  onToggle: () => void;
}

function DiffFileView({ file, isExpanded, onToggle }: DiffFileViewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const displayPath = file.newPath || file.oldPath;
  const fileName = displayPath.split("/").pop() || displayPath;

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const renderDiffContent = () => {
    if (file.isBinary) {
      return (
        <div className="p-3 text-xs opacity-70">
          Binary file {file.isNew ? "added" : file.isDeleted ? "deleted" : "modified"}
        </div>
      );
    }

    if (file.hunks.length === 0) {
      return (
        <div className="p-3 text-xs opacity-70">
          {file.isRenamed ? "File renamed" : "No changes"}
        </div>
      );
    }

    return (
      <div className="font-mono text-xs overflow-x-auto">
        {file.hunks.map((hunk, hunkIdx) => (
          <div key={hunkIdx}>
            <div className="bg-theme-background-alt px-3 py-1 opacity-60">
              @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
            </div>
            <div>
              {hunk.lines.map((line, lineIdx) => {
                const lineKey = `${hunkIdx}-${lineIdx}`;
                let bgClass = "";
                let textClass = "";
                let prefix = " ";

                if (line.type === "add") {
                  bgClass = "bg-theme-success/10";
                  textClass = "text-theme-success";
                  prefix = "+";
                } else if (line.type === "remove") {
                  bgClass = "bg-theme-error/10";
                  textClass = "text-theme-error";
                  prefix = "-";
                }

                return (
                  <div key={lineKey} className={`${bgClass} ${textClass} px-3`}>
                    <span className="opacity-50 select-none">{prefix}</span>
                    <span className="whitespace-pre-wrap break-all">{line.content}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="border border-theme-border rounded-md overflow-hidden bg-theme-background-alt">
      <div
        role="button"
        tabIndex={0}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-theme-background transition-colors gap-3 cursor-pointer"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isExpanded}
        aria-label={`Toggle changes for ${displayPath}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs opacity-60">{isExpanded ? "▼" : "▶"}</span>
          <span
            className="font-mono text-sm truncate"
            title={displayPath}
          >
            {fileName}
          </span>
          {file.isNew && (
            <Badge variant="foreground0" cap="square" className="text-xs shrink-0">
              new
            </Badge>
          )}
          {file.isDeleted && (
            <Badge variant="foreground0" cap="square" className="text-xs shrink-0">
              deleted
            </Badge>
          )}
          {file.isRenamed && (
            <Badge variant="foreground0" cap="square" className="text-xs shrink-0">
              renamed
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs opacity-70 font-mono">
            {formatDiffStats(file.additions, file.deletions)}
          </span>
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-theme-border bg-theme-background">
          {renderDiffContent()}
          <div className="p-3 border-t border-theme-border flex justify-end">
            <Button
              variant="background3"
              size="small"
              className="text-xs opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                const fileContent = file.hunks
                  .map((hunk) =>
                    hunk.lines
                      .map((line) => {
                        const prefix =
                          line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
                        return `${prefix}${line.content}`;
                      })
                      .join("\n")
                  )
                  .join("\n");
                copyToClipboard(fileContent, `file-${displayPath}`);
              }}
              title="Copy file diff"
            >
              {copiedField === `file-${displayPath}` ? "✓ Copied" : "⧉ Copy"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DiffPart({ diff, toolName = "edit", hideHeader = false }: DiffPartProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedFiles, setExpandedFiles] = useState<Set<number>>(new Set([0]));
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const parsedDiff = useMemo(() => {
    if (!diff.raw || !diff.hasParsedDiff) return null;
    try {
      return parseDiff(diff.raw);
    } catch {
      return null;
    }
  }, [diff.raw, diff.hasParsedDiff]);

  const isTooLarge = diff.raw ? isDiffTooLarge(diff.raw) : false;

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const toggleFile = (index: number) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const renderContent = () => {
    if (isTooLarge) {
      return (
        <div className="p-3 text-xs opacity-70">
          <p>Diff is too large to display ({diff.raw?.length.toLocaleString()} characters).</p>
          <p className="mt-2">
            Files affected: {diff.files?.join(", ") || "Unknown"}
          </p>
        </div>
      );
    }

    if (diff.raw) {
      // Attempt pretty renderer for any unified-looking diff
      return (
        <div className="p-2">
          <PrettyDiff diffText={diff.raw} />
        </div>
      );
    }

    if (diff.raw) {
      return (
        <div className="p-3">
          <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-theme-background p-2 rounded max-h-[400px] overflow-auto">
            {diff.raw}
          </pre>
        </div>
      );
    }

    if (diff.files && diff.files.length > 0) {
      return (
        <div className="p-3">
          <p className="text-xs opacity-70 mb-2">Files modified:</p>
          <ul className="text-xs font-mono leading-relaxed opacity-80">
            {diff.files.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        </div>
      );
    }

    return (
      <div className="p-3 text-xs opacity-70">
        No diff details available
      </div>
    );
  };

  const body = (
    <div className="border-t border-theme-border bg-theme-background">
      {renderContent()}
    </div>
  );

  if (hideHeader) {
    return (
      <div className="border border-theme-border rounded-md overflow-hidden bg-theme-background-alt mb-2">
        {body}
      </div>
    );
  }

  return (
    <div className="border border-theme-border rounded-md overflow-hidden bg-theme-background-alt mb-2">
      <div
        role="button"
        tabIndex={0}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-theme-background transition-colors cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded((v) => !v);
          }
        }}
        aria-expanded={isExpanded}
        aria-label="Toggle diff details"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">DIFF</span>
          <span className="text-sm font-medium">
            {toolName === "edit" ? "File Changes" : "Diff"}
          </span>
          <span className="text-xs opacity-60">
            {isExpanded ? "[-]" : "[+]"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {parsedDiff && (
            <Badge variant="foreground0" cap="square" className="text-xs">
              {formatDiffStats(parsedDiff.totalAdditions, parsedDiff.totalDeletions)}
            </Badge>
          )}
          {diff.files && diff.files.length > 0 && (
            <Badge variant="foreground0" cap="square" className="text-xs">
              {diff.files.length} {diff.files.length === 1 ? "file" : "files"}
            </Badge>
          )}
          {diff.raw && (
            <Button
              variant="background3"
              size="small"
              className="text-xs opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(diff.raw!, "raw-diff");
              }}
              title="Copy raw diff"
            >
              {copiedField === "raw-diff" ? "✓" : "⧉"}
            </Button>
          )}
        </div>
      </div>
      {isExpanded && body}
    </div>
  );
}
