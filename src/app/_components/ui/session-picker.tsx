import React, { useEffect, useState } from "react";
import { Badge, Separator, Button, Dialog, View, Checkbox } from "./index";
import { SessionSearchInput } from "./session-search";
import { SessionFilters } from "./session-filters";
import type { SessionFilters as SessionFiltersType } from "@/lib/session-index";

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
  onClose: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filters?: SessionFiltersType;
  onFiltersChange?: (filters: SessionFiltersType) => void;
}

export const SessionPicker: React.FC<SessionPickerProps> = ({
  sessions,
  currentSession,
  onSelect,
  onBulkDelete,
  onClose,
  searchQuery = "",
  onSearchChange,
  filters,
  onFiltersChange,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
           <Button
             variant="foreground1"
             box="round"
             size="small"
             onClick={toggleEditMode}
          >
            {isEditMode ? "Done" : "Edit"}
          </Button>
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
            sessions.map((session) => {
              const isSelected = currentSession?.id === session.id;
              const isChecked = selectedIds.has(session.id);
              return (
                <div
                  key={session.id}
                  className={`p-3 rounded transition-colors ${
                    isEditMode ? "flex items-start gap-3" : ""
                  }`}
                  style={{
                    backgroundColor: isSelected
                      ? "var(--theme-primary)"
                      : "var(--theme-backgroundAlt)",
                    color: isSelected
                      ? "var(--theme-background)"
                      : "var(--theme-foreground)",
                  }}
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
                        {isSelected && !isEditMode && (
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
