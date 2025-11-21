import React, { useEffect, useState, useRef, useMemo } from "react";
import { Badge, Separator, Button, Dialog, View } from "./index";
import { ProjectSearchInput } from "./project-search";

interface ProjectItem {
  id: string;
  worktree: string;
  vcs?: string;
  createdAt?: Date;
  updatedAt?: Date;
  health?: "ok" | "missing" | "unknown";
}

interface ProjectPickerProps {
  projects: ProjectItem[];
  currentProject: ProjectItem | null;
  onSelect: (project: ProjectItem) => void;
  onClose: () => void;
  onRefresh?: () => Promise<void>;
}

export const ProjectPicker: React.FC<ProjectPickerProps> = ({
  projects,
  currentProject,
  onSelect,
  onClose,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter projects based on search query and health
  const filteredProjects = useMemo(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[ProjectPicker] Received projects:", projects.length);
      projects.forEach(p => console.log(`  - ${p.worktree}: ${p.health} (ID: ${p.id})`));
      console.log("[ProjectPicker] Current Project ID:", currentProject?.id);
    }

    let result = projects;

    // Filter out missing projects unless it's the current one
    result = result.filter(p => {
      const keep = p.health !== "missing" || p.id === currentProject?.id;
      if (!keep && process.env.NODE_ENV !== "production") {
        console.log(`[ProjectPicker] Filtering out missing project: ${p.worktree}`);
      }
      return keep;
    });

    if (process.env.NODE_ENV !== "production") {
      const missing = result.filter(p => p.health === "missing");
      if (missing.length > 0) {
        console.log("[ProjectPicker] Found missing projects (kept because current):", missing.map(p => p.worktree));
      }
    }

    if (searchQuery.trim()) {
      result = result.filter((project) =>
        project.worktree.toLowerCase().includes(searchQuery.trim().toLowerCase())
      );
    }
    return result;
  }, [projects, searchQuery, currentProject]);

  const [selectedIndex, setSelectedIndex] = useState(() => {
    // Initialize with current project's index if it exists in filtered list
    const currentIndex = filteredProjects.findIndex((p) => p.id === currentProject?.id);
    return currentIndex >= 0 ? currentIndex : 0;
  });

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const searchInputRef = useRef<{ focus: () => void }>(null);

  // Focus search input when modal opens
  useEffect(() => {
    // Focus search input after a short delay to ensure modal is rendered
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Reset selectedIndex when filteredProjects changes
  useEffect(() => {
    if (filteredProjects.length > 0) {
      setSelectedIndex(0);
    } else {
      setSelectedIndex(-1);
    }
  }, [filteredProjects]);

  // Scroll selected item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredProjects.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredProjects[selectedIndex]) {
          onSelect(filteredProjects[selectedIndex]);
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, selectedIndex, filteredProjects, onSelect]);

  return (
    <Dialog open onClose={onClose}>
      <View
        className="overflow-hidden shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto scrollbar"
        style={{
          backgroundColor: "var(--theme-background)",
          borderColor: "var(--theme-primary)",
          borderWidth: "1px",
        }}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">Projects</h2>
            {onRefresh && (
              <Button
                variant="background2"
                size="small"
                box="square"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh projects"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isRefreshing ? "animate-spin" : ""}
                >
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
              </Button>
            )}
          </div>
          <ProjectSearchInput
            ref={searchInputRef}
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery("")}
            placeholder="Search projects..."
          />
        </div>

        <Separator />

        <div className="px-4 py-2 space-y-2 max-h-96 overflow-y-auto scrollbar">
          {projects.length === 0 ? (
            <div className="text-center text-sm py-4 opacity-70">
              No projects yet. Create one with /init.
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center text-sm py-4 opacity-70">
              No projects found
            </div>
          ) : (
            filteredProjects.map((project, index) => {
              const isCurrent = currentProject?.id === project.id;
              const isHighlighted = index === selectedIndex;
              const isMissing = project.health === "missing";

              return (
                <div
                  key={project.id}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  className="p-3 rounded transition-colors cursor-pointer"
                  style={{
                    backgroundColor: isCurrent
                      ? "var(--theme-primary)"
                      : isHighlighted
                        ? "var(--theme-backgroundAlt)"
                        : "transparent",
                    color: isCurrent
                      ? "var(--theme-background)"
                      : "var(--theme-foreground)",
                    border: isCurrent
                      ? "1px solid transparent"
                      : "1px solid var(--theme-borderSubtle)",
                    outline: isHighlighted && !isCurrent
                      ? "2px solid var(--theme-primary)"
                      : "none",
                    outlineOffset: "-2px",
                    opacity: isMissing && !isCurrent ? 0.6 : 1,
                  }}
                  onClick={() => {
                    onSelect(project);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {project.worktree}
                        {process.env.NODE_ENV !== "production" && ` (${project.health})`}
                        {isMissing && (
                          <span title="Project directory not found">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={isCurrent ? "text-white" : "text-yellow-500"}
                            >
                              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                              <path d="M12 9v4" />
                              <path d="M12 17h.01" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {project.createdAt?.toLocaleDateString() || "Unknown"}
                      </div>
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
