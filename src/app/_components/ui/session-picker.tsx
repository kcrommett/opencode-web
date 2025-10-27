import React, { useEffect, useState, useRef } from "react";
import { Badge, Separator, Button, Dialog, View, Checkbox } from "./index";

interface Session {
  id: string;
  title?: string;
  directory?: string;
  projectID?: string;
  createdAt?: Date;
  updatedAt?: Date;
  messageCount?: number;
}

interface SessionPickerProps {
  sessions: Session[];
  currentSession: Session | null;
  onSelect: (sessionId: string) => void;
  onBulkDelete?: (sessionIds: string[]) => void;
  onNewSession?: () => void;
  onClose: () => void;
}

export const SessionPicker: React.FC<SessionPickerProps> = ({
  sessions,
  currentSession,
  onSelect,
  onBulkDelete,
  onNewSession,
  onClose,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [highlightedIndex, setHighlightedIndex] = useState(() => {
    // Initialize with current session's index if it exists
    const currentIndex = sessions.findIndex((s) => s.id === currentSession?.id);
    return currentIndex >= 0 ? currentIndex : 0;
  });
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const selectAll = () => {
    setSelectedIds(new Set(sessions.map((s) => s.id)));
  };

  const handleBulkDeleteClick = () => {
    if (onBulkDelete && selectedIds.size > 0) {
      onBulkDelete(Array.from(selectedIds));
      clearSelection();
      setIsEditMode(false);
    }
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    clearSelection();
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [highlightedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (!isEditMode && e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, sessions.length - 1));
      } else if (!isEditMode && e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      } else if (!isEditMode && e.key === "Enter") {
        e.preventDefault();
        if (sessions[highlightedIndex]) {
          onSelect(sessions[highlightedIndex].id);
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isEditMode, highlightedIndex, sessions, onSelect]);

  return (
    <Dialog open onClose={onClose}>
      <View
        box="square"
        className="rounded border overflow-hidden shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto scrollbar"
        style={{
          backgroundColor: "var(--theme-background)",
          borderColor: "var(--theme-primary)",
          borderWidth: "1px",
        }}
      >
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Sessions</h2>
          <div className="flex gap-2">
            {onNewSession && (
              <Button
                variant="foreground0"
                box="round"
                size="small"
                onClick={() => {
                  onNewSession();
                  onClose();
                }}
              >
                New Session
              </Button>
            )}
            <Button
              variant="foreground1"
              box="round"
              size="small"
              onClick={toggleEditMode}
            >
              {isEditMode ? "Done" : "Edit"}
            </Button>
          </div>
        </div>

        <Separator />

        {isEditMode && (
          <>
            <div
              className="flex items-center justify-between gap-2 px-4 py-2"
              style={{
                backgroundColor: "var(--theme-surface, var(--theme-backgroundAlt))",
                borderBottom: "1px solid var(--theme-border, rgba(255,255,255,0.1))",
              }}
            >
               <Button
                 variant="foreground1"
                 box="round"
                 size="small"
                 onClick={selectAll}
              >
                Select All
              </Button>
               <Button
                 variant="error"
                 box="round"
                 size="small"
                 onClick={handleBulkDeleteClick}
                 className="delete-button-bulk"
                 disabled={selectedIds.size === 0}
              >
                Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
              </Button>
            </div>
          </>
        )}

        <div className="px-4 py-2 space-y-2 max-h-96 overflow-y-auto scrollbar">
          {sessions.length === 0 ? (
            <div className="text-center text-sm py-4 opacity-70">
              No sessions yet. Create one above.
            </div>
          ) : (
            sessions.map((session, index) => {
              const isCurrent = currentSession?.id === session.id;
              const isChecked = selectedIds.has(session.id);
              const isHighlighted = index === highlightedIndex;
              return (
                <div
                  key={session.id}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  className={`p-3 rounded transition-colors ${
                    isEditMode ? "flex items-start gap-3" : ""
                  }`}
                  style={{
                    backgroundColor: isCurrent
                      ? "var(--theme-primary)"
                      : isHighlighted && !isEditMode
                        ? "var(--theme-backgroundAlt)"
                        : "var(--theme-background)",
                    color: isCurrent
                      ? "var(--theme-background)"
                      : "var(--theme-foreground)",
                    outline: isHighlighted && !isCurrent && !isEditMode
                      ? "2px solid var(--theme-primary)"
                      : "none",
                    outlineOffset: "-2px",
                  }}
                  onMouseEnter={() => !isEditMode && setHighlightedIndex(index)}
                >
                  {isEditMode && (
                    <Checkbox
                      checked={isChecked}
                      onChange={(e) =>
                        toggleSelection(
                          session.id,
                          e as unknown as React.MouseEvent,
                        )
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                  )}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      if (!isEditMode) {
                        onSelect(session.id);
                        onClose();
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {session.title || session.id.slice(0, 8)}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          {session.createdAt?.toLocaleDateString() || "Unknown"}
                          {session.messageCount !== undefined && (
                            <span className="ml-2">
                              • {session.messageCount} messages
                            </span>
                          )}
                        </div>
                        {session.directory && (
                          <div className="text-xs opacity-50 truncate mt-1">
                            {session.directory}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {isCurrent && !isEditMode && (
                          <Badge
                            variant="background2"
                            cap="round"
                            className="text-xs"
                          >
                            Current
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Separator />
        <div className="p-4 flex justify-end">
           <Button
             variant="background2"
             box="round"
             onClick={onClose}
             size="small"
          >
            Close
          </Button>
        </div>
      </View>
    </Dialog>
  );
};
