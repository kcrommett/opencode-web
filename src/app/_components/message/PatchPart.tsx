import { useState } from "react";
import type { Part } from "@/types/opencode";
import { Badge } from "../ui";
import { DiffPart } from "./DiffPart";
import { extractDiffMetadata } from "@/lib/tool-helpers";

interface PatchPartProps {
  part: Part;
}

export function PatchPart({ part }: PatchPartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (part.type !== "patch") return null;

  const metadata = extractDiffMetadata(part);
  const hasDiff = Boolean(metadata?.raw && metadata.raw.trim().length > 0);
  const hasFiles = Boolean(metadata?.files && metadata.files.length > 0);
  const contentId = part.id ? `patch-${part.id}` : undefined;

  const toggle = () => {
    setIsExpanded((value) => !value);
  };

  return (
    <div className="border border-theme-border rounded-md overflow-hidden bg-theme-background-alt mb-2">
      <div
        role="button"
        tabIndex={0}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-theme-background transition-colors cursor-pointer"
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs opacity-60">PATCH</span>
          <span className="text-sm font-medium">File Changes</span>
          <span className="text-xs opacity-60">
            {isExpanded ? "[-]" : "[+]"}
          </span>
        </div>
        {(hasFiles || hasDiff) && (
          <Badge variant="foreground1" cap="round" className="text-xs">
            {hasFiles
              ? `${metadata!.files!.length} ${metadata!.files!.length === 1 ? "file" : "files"}`
              : `${metadata!.raw!.length} chars`}
          </Badge>
        )}
      </div>
      {isExpanded && (
        <div id={contentId} className="border-t border-theme-border bg-theme-background">
          {metadata ? (
            <div className="p-2">
              <DiffPart diff={metadata} toolName="edit" hideHeader />
            </div>
          ) : (
            <div className="p-3 text-xs opacity-70">
              No file diff details were returned for this message.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
