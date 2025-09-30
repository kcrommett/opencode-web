import type { Part } from "../../../../node_modules/@opencode-ai/sdk/dist/gen/types.gen";
import { Pre } from '../ui';

interface TextPartProps {
  part: Part;
}

export function TextPart({ part }: TextPartProps) {
  if (part.type !== 'text') return null;
  
  const text = 'text' in part ? part.text : '';
  
  return (
    <Pre size="small" className="break-words whitespace-pre-wrap">
      {text}
    </Pre>
  );
}