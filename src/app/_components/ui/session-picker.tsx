import React, { useEffect, useState, useRef, useCallback } from "react";
import { Badge, Separator, Button, Dialog, View, Checkbox } from "./index";
import { SessionSearchInput } from "./session-search";
import { SessionFilters } from "./session-filters";
import type { SessionFilters as SessionFiltersType } from "@/lib/session-index";

export interface SessionPickerEditControls {
  enterEditMode: () => void;
  exitEditMode: () => void;
  toggleEditMode: () => void;
}

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
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filters?: SessionFiltersType;
  onFiltersChange?: (filters: SessionFiltersType) => void;
  onRegisterEditControls?: (
    controls: SessionPickerEditControls | null,
  ) => void;
  onEditModeChange?: (isEditMode: boolean) => void;
}

export const SessionPicker: React.FC<SessionPickerProps> = ({
  sessions,
  currentSession,
  onSelect,
  onBulkDelete,
  onNewSession,
  onClose,
  searchQuery = "",
  onSearchChange,
  filters,
  onFiltersChange,
  onRegisterEditControls,
  onEditModeChange,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [highlightedIndex, setHighlightedIndex] = useState(() => {
    // Initialize with current session's index if it exists
    const currentIndex = sessions.findIndex((s) => s.id === currentSession?.id);
    return currentIndex >= 0 ? currentIndex : 0;
  });
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const toggleSelection = useCallback(
    (id: string, event?: React.SyntheticEvent) => {
      event?.stopPropagation?.();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(sessions.map((s) => s.id)));
  }, [sessions]);

  const enterEditMode = useCallback(() => {
    setIsEditMode(true);
    clearSelection();
  }, [clearSelection]);

  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    clearSelection();
  }, [clearSelection]);

  const handleBulkDeleteClick = () => {
    if (onBulkDelete && selectedIds.size > 0) {
      onBulkDelete(Array.from(selectedIds));
      exitEditMode();
    }
  };

  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
    clearSelection();
  }, [clearSelection]);

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
    if (sessions.length === 0) {
      setHighlightedIndex(0);
      return;
    }

    setHighlightedIndex((prev) =>
      Math.min(prev, Math.max(0, sessions.length - 1)),
    );
  }, [sessions]);

  useEffect(() => {
    onEditModeChange?.(isEditMode);
  }, [isEditMode, onEditModeChange]);

  useEffect(
    () => () => {
      onEditModeChange?.(false);
    },
    [onEditModeChange],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;

      if (key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (sessions.length === 0) {
        return;
      }

      if (key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        setHighlightedIndex((prev) =>
          Math.min(prev + 1, sessions.length - 1),
        );
        return;
      }

      if (key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      const clampedIndex = Math.min(
        Math.max(highlightedIndex, 0),
        sessions.length - 1,
      );
      const highlightedSession = sessions[clampedIndex];

      if (isEditMode) {
        if (key === " " || key === "Spacebar") {
          if (highlightedSession) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
            toggleSelection(highlightedSession.id);
          }
        }
        return;
      }

      if (key === "Enter" && highlightedSession) {
        event.preventDefault();
        onSelect(highlightedSession.id);
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    highlightedIndex,
    isEditMode,
    onClose,
    onSelect,
    sessions,
    toggleSelection,
  ]);

  useEffect(() => {
    if (!onRegisterEditControls) {
      return;
    }

    const controls: SessionPickerEditControls = {
      enterEditMode,
      exitEditMode,
      toggleEditMode,
    };

    onRegisterEditControls(controls);
    return () => onRegisterEditControls(null);
  }, [onRegisterEditControls, enterEditMode, exitEditMode, toggleEditMode]);

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
                variant="foreground1"
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

        {/* Search Input */}
        {onSearchChange && (
          <div className="px-4 pt-3 pb-2">
            <SessionSearchInput
              value={searchQuery}
              onChange={onSearchChange}
              onClear={() => onSearchChange("")}
            />
            {searchQuery && (
              <div className="text-xs opacity-70 mt-2">
                {sessions.length} session{sessions.length !== 1 ? "s" : ""} found
              </div>
            )}
          </div>
        )}

        {/* Advanced Filters */}
        {filters && onFiltersChange && (
          <div className="px-4 pb-2">
            <SessionFilters filters={filters} onChange={onFiltersChange} />
          </div>
        )}

        {isEditMode && (
          <>
            <div
              className="flex items-center justify-between gap-2 px-4 py-2"
              style={{
                backgroundColor: "var(--theme-surface, var(--theme-backgroundAlt))",
                borderBottom: "1px solid var(--theme-border, rgba(255,255,255,0.1))",
              }}
            >
              <div className="flex items-center gap-2">
                <Button
                  variant="foreground1"
                  box="round"
                  size="small"
                  onClick={selectAll}
                >
                  Select All
                </Button>
                <Button
                  variant="foreground2"
                  box="round"
                  size="small"
                  onClick={clearSelection}
                  disabled={selectedIds.size === 0}
                >
                  Clear
                </Button>
              </div>
              <Button
                variant="foreground2"
                box="round"
                size="small"
                onClick={handleBulkDeleteClick}
                className={`delete-button-bulk ${selectedIds.size > 0 ? 'dangerous-bulk-delete' : ''}`}
                disabled={selectedIds.size === 0}
              >
                <span className={selectedIds.size > 0 ? 'text-red-500' : ''}>
                  Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                </span>
              </Button>
            </div>
          </>
        )}

        <div className="px-4 py-2 space-y-2 max-h-96 overflow-y-auto scrollbar">
          {sessions.length === 0 ? (
            <div className="text-center text-sm py-4 opacity-70">
              {searchQuery ? (
                <>
                  <div className="mb-2">No sessions found matching "{searchQuery}"</div>
                  {onSearchChange && (
                    <Button
                      variant="foreground1"
                      box="round"
                      size="small"
                      onClick={() => onSearchChange("")}
                    >
                      Clear search
                    </Button>
                  )}
                </>
              ) : (
                "No sessions yet. Create one above."
              )}
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
                  className={`p-3 rounded transition-colors cursor-pointer ${
                    isEditMode ? "flex items-start gap-3" : ""
                  }`}
                  style={{
                    backgroundColor: isCurrent
                      ? "var(--theme-primary)"
                      : isChecked
                        ? "rgba(from var(--theme-primary) r g b / 0.15)"
                        : isHighlighted
                          ? "var(--theme-backgroundAlt)"
                          : "transparent",
                    color: isCurrent
                      ? "var(--theme-background)"
                      : "var(--theme-foreground)",
                    border: isCurrent
                      ? "1px solid transparent"
                      : `1px solid ${isChecked ? "var(--theme-primary)" : "var(--theme-borderSubtle)"}`,
                    outline:
                      isHighlighted && !isCurrent
                        ? "2px solid var(--theme-primary)"
                        : "none",
                    outlineOffset: "-2px",
                  }}
                  onMouseEnter={() => !isEditMode && setHighlightedIndex(index)}
                  onClick={(event) => {
                    if (isEditMode) {
                      toggleSelection(session.id, event);
                      return;
                    }

                    onSelect(session.id);
                    onClose();
                  }}
                >
                  {isEditMode && (
                    <Checkbox
                      checked={isChecked}
                      onChange={(event) => toggleSelection(session.id, event)}
                      onClick={(event) => event.stopPropagation()}
                      className="mt-1"
                    />
                  )}
                  <div
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div 
                          className="font-medium truncate"
                          title={session.title || session.id.slice(0, 8)}
                        >
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
                        {isCurrent && (
                          <Badge
                            variant="background2"
                            cap="square"
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
