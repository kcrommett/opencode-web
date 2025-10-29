import React, { useState } from "react";
import { Button, Badge } from "./index";
import type { SessionFilters as SessionFiltersType } from "@/lib/session-index";

interface SessionFiltersProps {
  filters: SessionFiltersType;
  onChange: (filters: SessionFiltersType) => void;
}

export const SessionFilters: React.FC<SessionFiltersProps> = ({
  filters,
  onChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSortByChange = (sortBy: "created" | "updated" | "title") => {
    onChange({ ...filters, sortBy });
  };

  const handleSortOrderToggle = () => {
    const newOrder = filters.sortOrder === "asc" ? "desc" : "asc";
    onChange({ ...filters, sortOrder: newOrder });
  };

  const handleDateFromChange = (value: string) => {
    onChange({ ...filters, dateFrom: value ? new Date(value) : undefined });
  };

  const handleDateToChange = (value: string) => {
    onChange({ ...filters, dateTo: value ? new Date(value) : undefined });
  };

  const clearFilters = () => {
    onChange({
      sortBy: "updated",
      sortOrder: "desc",
    });
  };

  const hasActiveFilters = Boolean(
    filters.dateFrom || filters.dateTo || filters.sortBy !== "updated"
  );

  // Format date for input value
  const formatDateForInput = (date?: Date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return (
    <div
      className="border rounded"
      style={{
        backgroundColor: "var(--theme-background)",
        borderColor: "var(--theme-border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          backgroundColor: "var(--theme-backgroundAlt)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Advanced Filters</span>
          {hasActiveFilters && (
            <Badge variant="background0" cap="square" className="text-xs">
              Active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="foreground1"
              box="round"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                clearFilters();
              }}
            >
              Clear
            </Button>
          )}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Sort controls */}
          <div>
            <label className="text-xs font-medium opacity-70 block mb-1">
              Sort By
            </label>
            <div className="flex gap-2">
              <select
                value={filters.sortBy || "updated"}
                onChange={(e) =>
                  handleSortByChange(
                    e.target.value as "created" | "updated" | "title"
                  )
                }
                className="flex-1 px-2 py-1 rounded text-sm"
                is-="input"
                style={{
                  backgroundColor: "var(--theme-backgroundAlt)",
                  color: "var(--theme-foreground)",
                  borderColor: "var(--theme-border)",
                }}
              >
                <option value="updated">Last Updated</option>
                <option value="created">Created Date</option>
                <option value="title">Title</option>
              </select>
              <Button
                variant="foreground1"
                box="round"
                size="small"
                onClick={handleSortOrderToggle}
                aria-label={
                  filters.sortOrder === "asc" ? "Ascending" : "Descending"
                }
              >
                {filters.sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </div>

          {/* Date range filter */}
          <div>
            <label className="text-xs font-medium opacity-70 block mb-1">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs opacity-50 block mb-1">From</label>
                <input
                  type="date"
                  value={formatDateForInput(filters.dateFrom)}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className="w-full px-2 py-1 rounded text-sm"
                  is-="input"
                  style={{
                    backgroundColor: "var(--theme-backgroundAlt)",
                    color: "var(--theme-foreground)",
                    borderColor: "var(--theme-border)",
                  }}
                />
              </div>
              <div>
                <label className="text-xs opacity-50 block mb-1">To</label>
                <input
                  type="date"
                  value={formatDateForInput(filters.dateTo)}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  className="w-full px-2 py-1 rounded text-sm"
                  is-="input"
                  style={{
                    backgroundColor: "var(--theme-backgroundAlt)",
                    color: "var(--theme-foreground)",
                    borderColor: "var(--theme-border)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="pt-2 border-t" style={{ borderColor: "var(--theme-border)" }}>
              <div className="text-xs font-medium opacity-70 mb-2">
                Active Filters:
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.sortBy && filters.sortBy !== "updated" && (
                  <Badge variant="background2" cap="square" className="text-xs">
                    Sort: {filters.sortBy === "created" ? "Created" : "Title"}{" "}
                    {filters.sortOrder === "asc" ? "↑" : "↓"}
                  </Badge>
                )}
                {filters.dateFrom && (
                  <Badge variant="background2" cap="square" className="text-xs">
                    From: {filters.dateFrom.toLocaleDateString()}
                  </Badge>
                )}
                {filters.dateTo && (
                  <Badge variant="background2" cap="square" className="text-xs">
                    To: {filters.dateTo.toLocaleDateString()}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
