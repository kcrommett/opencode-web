import { useMemo, useState } from "react";
import { isDiffTooLarge } from "@/lib/diff-utils";
import { Button } from "../ui";
import { html as diff2html, parse as diff2parse } from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";
import "./diff2html-overrides.css";

interface PrettyDiffProps {
  diffText: string;
}

function looksUnified(diff: string) {
  if (!diff) return false;
  const s = diff.slice(0, 1000);
  return s.includes("diff --git") || (s.includes("\n--- ") && s.includes("\n+++ "));
}

export function PrettyDiff({ diffText }: PrettyDiffProps) {
  const [view, setView] = useState<"line-by-line" | "side-by-side">("line-by-line");
  const [open, setOpen] = useState<Set<number>>(new Set([0]));

  const content = useMemo(() => {
    if (!diffText || !looksUnified(diffText)) return { files: null as any[] | null, error: null as string | null };
    if (isDiffTooLarge(diffText)) {
      return { files: null, error: "Diff too large to prettify" };
    }
    try {
      const json = diff2parse(diffText, {} as any) as any[];
      return { files: json, error: null };
    } catch (e) {
      return { files: null, error: e instanceof Error ? e.message : "Failed to parse diff" };
    }
  }, [diffText]);

  if (!diffText) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2 px-2 pt-2">
        <Button
          variant="background3"
          size="small"
          className="text-xs"
          onClick={() => setView((v) => (v === "line-by-line" ? "side-by-side" : "line-by-line"))}
        >
          {view === "line-by-line" ? "Side-by-side" : "Line-by-line"}
        </Button>
      </div>
      {content.files ? (
        <div className="space-y-2">
          {content.files.map((file, idx) => {
            const single = [file];
            const fileHtml = diff2html(single as any, {
              outputFormat: view,
              drawFileList: false,
              matching: "lines",
              colorScheme: "dark",
            } as any);
            const fileName = (file?.newName || file?.oldName || file?.fileName || "").replace(/^([ab]\/)*/g, "");
            const isOpen = open.has(idx);
            return (
              <div key={idx} className="border border-theme-border rounded-md overflow-hidden">
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between p-2 bg-theme-background-alt cursor-pointer"
                  onClick={() => setOpen((prev) => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpen((prev) => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
                    }
                  }}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs opacity-60">{isOpen ? "▼" : "▶"}</span>
                    <span className="font-mono text-xs sm:text-sm truncate" title={fileName}>{fileName || `File ${idx + 1}`}</span>
                  </div>
                </div>
                {isOpen && (
                  <div className="overflow-auto">
                    <div className="diff2html-wrapper" dangerouslySetInnerHTML={{ __html: fileHtml }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {content.error && (
            <div className="px-3 pt-2 text-xs opacity-70">{content.error}</div>
          )}
          <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-theme-background p-2 rounded max-h-[400px] overflow-auto">
            {diffText}
          </pre>
        </div>
      )}
    </div>
  );
}
