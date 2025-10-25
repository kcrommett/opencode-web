import type { Part } from "@/types/opencode";
import { Pre } from "../ui";

interface TextPartProps {
  part: Part;
}

export function TextPart({ part }: TextPartProps) {
  if (part.type !== "text") return null;

  const text = "text" in part ? part.text || "" : "";

  // Check if text contains code blocks that should preserve formatting
  const hasCodeBlocks = /```[\s\S]*?```|`[^`]+`/.test(text);
  
  // For text with code blocks, preserve formatting with horizontal scroll
  // For plain text, use word wrapping for better readability
  const textClassName = hasCodeBlocks 
    ? "whitespace-pre overflow-x-auto font-mono text-sm leading-relaxed"
    : "whitespace-pre-wrap break-words overflow-wrap-anywhere font-sans text-sm leading-relaxed";

  return (
    <Pre size="small" className={textClassName}>
      {text}
    </Pre>
  );
}
