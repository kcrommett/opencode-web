import type { Part } from "@/types/opencode";
import { Pre } from "../ui";
import { MarkdownRenderer, hasMarkdownSyntax } from "@/lib/markdown";
import { useOpenCode } from "@/hooks/useOpenCode";
import { getFeatureFlags } from "@/lib/config";

interface TextPartProps {
  part: Part;
}

export function TextPart({ part }: TextPartProps) {
  const { config } = useOpenCode();
  const features = getFeatureFlags(config);

  if (part.type !== "text") return null;

  const text = "text" in part ? part.text || "" : "";

  // If markdown is enabled and content has markdown syntax, render with markdown
  if (features.enableMarkdown && hasMarkdownSyntax(text)) {
    return (
      <MarkdownRenderer
        content={text}
        enableImages={features.enableMarkdownImages}
      />
    );
  }

  // Fallback to plain text rendering
  const hasCodeBlocks = /```[\s\S]*?```|`[^`]+`/.test(text);
  const textClassName = hasCodeBlocks 
    ? "whitespace-pre overflow-x-auto font-mono text-sm leading-relaxed"
    : "whitespace-pre-wrap break-words overflow-wrap-anywhere font-sans text-sm leading-relaxed";

  return (
    <Pre size="small" className={textClassName}>
      {text}
    </Pre>
  );
}
