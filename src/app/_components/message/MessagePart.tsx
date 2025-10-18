import type { Part } from '@/types/opencode';
import { TextPart } from './TextPart';
import { ReasoningPart } from './ReasoningPart';
import { ToolPart } from './ToolPart';
import { FilePart } from './FilePart';
import { StepPart } from './StepPart';
import { PatchPart } from './PatchPart';
import { AgentPart } from './AgentPart';
import { SnapshotPart } from './SnapshotPart';

interface MessagePartProps {
  part: Part;
  messageRole: 'user' | 'assistant';
  showDetails?: boolean;
}

export function MessagePart({ part, messageRole: _messageRole, showDetails = true }: MessagePartProps) {
  switch (part.type) {
    case 'text':
      return <TextPart part={part} />;
    case 'reasoning':
      return <ReasoningPart part={part} showDetails={showDetails} />;
    case 'tool':
      return <ToolPart part={part} showDetails={showDetails} />;
    case 'file':
      return <FilePart part={part} />;
    case 'step-start':
    case 'step-finish':
      return <StepPart part={part} showDetails={showDetails} />;
    case 'patch':
      return <PatchPart part={part} />;
    case 'agent':
      return <AgentPart part={part} />;
    case 'snapshot':
      return <SnapshotPart part={part} />;
    default:
      return null;
  }
}
