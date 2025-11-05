import { useState, useMemo } from "react";
import type { Part } from "@/types/opencode";
import { Badge, Button } from "../ui";
import { formatFileSize } from "@/lib/image-utils";
import { generateUnifiedDiff } from "@/lib/diff-utils";
import { PrettyDiff } from "./PrettyDiff";
import { useOpenCode } from "@/hooks/useOpenCode";

interface FilePartProps {
  part: Part;
}

export function FilePart({ part }: FilePartProps) {
  // Hooks must be called before any conditional returns
  const { currentSessionDiffs } = useOpenCode();
  const [viewMode, setViewMode] = useState<"content" | "diff">("content");

  const rawPath = "path" in part ? part.path : undefined;
  const pathString = rawPath ? String(rawPath) : undefined;
  const rawName = typeof part.name === "string" ? part.name : undefined;
  const displayName = rawName && rawName.trim().length > 0 ? rawName : pathString ?? "attachment";

  const size =
    "size" in part && typeof part.size === "number" ? part.size : undefined;

  const rawContent = typeof part.content === "string" ? part.content : undefined;
  const rawMimeType =
    typeof part.mimeType === "string"
      ? part.mimeType
      : typeof (part as { mime?: unknown }).mime === "string"
        ? (part as { mime?: string }).mime
        : typeof (part as { contentType?: unknown }).contentType === "string"
          ? (part as { contentType?: string }).contentType
          : undefined;

  const normalizedMimeType = rawMimeType?.trim();

  const mimeType =
    normalizedMimeType && normalizedMimeType.length > 0
      ? normalizedMimeType
      : rawContent?.startsWith("data:")
        ? rawContent.match(/^data:([^;]+);/)?.[1]
        : undefined;

  const resolvedContent =
    rawContent && !rawContent.startsWith("data:") && mimeType
      ? `data:${mimeType};base64,${rawContent}`
      : rawContent;

  const remoteUrl = typeof part.url === "string" ? part.url : undefined;
  const href = resolvedContent ?? remoteUrl;
  const isDataHref = href?.startsWith("data:") ?? false;
  const actionLabel = isDataHref ? "Download" : "Open";

  const isImage =
    (mimeType && mimeType.startsWith("image/")) ||
    (resolvedContent?.startsWith("data:image/") ?? false);

  const imageSource = isImage ? resolvedContent ?? remoteUrl : undefined;

  const normalizeDiffPathValue = (input?: string | null) => {
    if (typeof input !== "string") return undefined;
    return input.replace(/^a\//, "").replace(/^b\//, "");
  };

  // Find matching diff for this file (must be before early return)
  const matchingDiff = useMemo(() => {
    if (part.type !== "file") return undefined;
    if (!currentSessionDiffs.length) return undefined;
    const fileName = displayName.split("/").pop();
    return currentSessionDiffs.find((diff) => {
      const candidates = [
        normalizeDiffPathValue(diff.path),
        normalizeDiffPathValue(diff.file),
        normalizeDiffPathValue(diff.oldPath),
        normalizeDiffPathValue(diff.newPath),
      ].filter(Boolean) as string[];

      return candidates.some((candidate) => {
        const candidateName = candidate.split("/").pop();
        return (
          candidate === displayName ||
          (pathString && candidate === pathString) ||
          (!!fileName && candidateName === fileName)
        );
      });
    });
  }, [currentSessionDiffs, displayName, pathString]);

  const hasDiff = !!matchingDiff;

  const diffDisplayPath = normalizeDiffPathValue(
    matchingDiff?.path ??
      matchingDiff?.file ??
      matchingDiff?.newPath ??
      matchingDiff?.oldPath,
  ) ?? displayName ?? pathString ?? undefined;

  const resolvedDiffText = useMemo(() => {
    if (part.type !== "file" || !matchingDiff) return null;
    const fallbackPath = diffDisplayPath ?? displayName ?? pathString ?? "file";

    if (matchingDiff.diff && matchingDiff.diff.trim().length > 0) {
      return matchingDiff.diff;
    }

    if (matchingDiff.hunks && matchingDiff.hunks.length > 0) {
      const oldPath = normalizeDiffPathValue(matchingDiff.oldPath) ?? fallbackPath;
      const newPath =
        normalizeDiffPathValue(matchingDiff.path) ??
        normalizeDiffPathValue(matchingDiff.newPath) ??
        fallbackPath;

      const header = [
        `diff --git a/${oldPath} b/${newPath}`,
        `--- a/${oldPath}`,
        `+++ b/${newPath}`,
      ];

      const body = matchingDiff.hunks.flatMap((hunk) => [
        `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
        ...hunk.lines.map((line) => {
          const symbol =
            line.type === "add"
              ? "+"
              : line.type === "remove" || line.type === "delete"
                ? "-"
                : " ";
          return `${symbol}${line.content}`;
        }),
      ]);

      return [...header, ...body].join("\n");
    }

    if (
      typeof matchingDiff.before === "string" &&
      typeof matchingDiff.after === "string"
    ) {
      return generateUnifiedDiff(
        fallbackPath,
        matchingDiff.before,
        matchingDiff.after,
      );
    }

    return null;
  }, [matchingDiff, diffDisplayPath, displayName, pathString, part.type]);

  // Early return after all hooks
  if (part.type !== "file") return null;

  return (
    <div className="mb-2 space-y-2 rounded-md border border-theme-border bg-theme-background-alt p-3 max-w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wide opacity-70">
            FILE
          </span>
          <span className="text-sm font-medium break-all" title={displayName}>
            {displayName}
          </span>
          {hasDiff && (
            <Badge variant="foreground0" cap="square" className="text-xs">
              {matchingDiff.additions > 0 && `+${matchingDiff.additions}`}
              {matchingDiff.additions > 0 && matchingDiff.deletions > 0 && " "}
              {matchingDiff.deletions > 0 && `-${matchingDiff.deletions}`}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-theme-muted">
          {hasDiff && (
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === "content" ? "background3" : "background2"}
                size="small"
                onClick={() => setViewMode("content")}
                className="text-xs px-2 py-1"
                title="Show file content"
              >
                Content
              </Button>
              <Button
                variant={viewMode === "diff" ? "background3" : "background2"}
                size="small"
                onClick={() => setViewMode("diff")}
                className="text-xs px-2 py-1"
                title="Show diff"
              >
                Diff
              </Button>
            </div>
          )}
          {mimeType && (
            <span className="truncate max-w-[10rem]" title={mimeType}>
              {mimeType}
            </span>
          )}
          {typeof size === "number" && (
            <Badge variant="foreground0" cap="square" className="text-xs">
              {formatFileSize(size)}
            </Badge>
          )}
          {href && (
            <a
              href={href}
              download={isDataHref ? displayName : undefined}
              target={isDataHref ? undefined : "_blank"}
              rel={isDataHref ? undefined : "noreferrer"}
              className="text-theme-primary hover:underline"
            >
              {actionLabel}
            </a>
          )}
        </div>
      </div>
      {viewMode === "diff" && matchingDiff ? (
        matchingDiff.binary ? (
          <div className="overflow-hidden rounded border border-theme-border bg-theme-background max-w-full p-3 text-xs opacity-70">
            Binary changes detected; diff preview unavailable.
          </div>
        ) : resolvedDiffText ? (
          <div className="overflow-hidden rounded border border-theme-border bg-theme-background max-w-full">
            <PrettyDiff diffText={resolvedDiffText} />
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-theme-border bg-theme-background max-w-full p-3 text-xs opacity-70">
            No diff details available for this file.
          </div>
        )
      ) : imageSource ? (
        <div className="overflow-hidden rounded border border-theme-border bg-theme-background max-w-full">
          <img
            src={imageSource}
            alt={displayName}
            className="max-h-64 w-full object-contain"
            loading="lazy"
          />
        </div>
      ) : null}
    </div>
  );
}
