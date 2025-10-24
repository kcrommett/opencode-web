import type { Part } from "@/types/opencode";
import { Pre } from "../ui";

interface TextPartProps {
  part: Part;
}

export function TextPart({ part }: TextPartProps) {
  if (part.type !== "text") return null;

  const text = "text" in part ? part.text : "";

  return (
    <Pre size="small" className="whitespace-pre overflow-x-auto">
      {text}
    </Pre>
  );
}
