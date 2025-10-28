import type { ImageAttachment } from "@/types/opencode";
import { formatFileSize } from "@/lib/image-utils";

interface ImagePreviewProps {
  attachment: ImageAttachment;
  onRemove: (id: string) => void;
}

export function ImagePreview({ attachment, onRemove }: ImagePreviewProps) {
  return (
    <div className="relative inline-block" title={`${attachment.name} (${formatFileSize(attachment.size)})`}>
      <img
        src={attachment.dataUrl}
        alt={attachment.name}
        className="max-h-20 max-w-20 rounded border border-theme-border object-cover"
        loading="lazy"
      />
      <button
        onClick={() => onRemove(attachment.id)}
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-theme-error text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
        title="Remove image"
        type="button"
      >
        ×
      </button>
      <div className="mt-1 max-w-20 text-xs text-theme-muted">
        <div className="truncate">{attachment.name}</div>
        <div className="text-[10px] uppercase tracking-wide">
          {formatFileSize(attachment.size)}
        </div>
      </div>
    </div>
  );
}
