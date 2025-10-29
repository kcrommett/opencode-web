import type { Part } from "@/types/opencode";
import { Badge } from "../ui";
import { formatFileSize } from "@/lib/image-utils";

interface FilePartProps {
  part: Part;
}

export function FilePart({ part }: FilePartProps) {
  if (part.type !== "file") return null;

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

  return (
    <div className="mb-2 space-y-2 rounded-md border border-theme-border bg-theme-background-alt p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wide opacity-70">
            FILE
          </span>
          <span className="text-sm font-medium break-all" title={displayName}>
            {displayName}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-theme-muted">
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
      {imageSource && (
        <div className="overflow-hidden rounded border border-theme-border bg-theme-background">
          <img
            src={imageSource}
            alt={displayName}
            className="max-h-64 w-full object-contain"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}
