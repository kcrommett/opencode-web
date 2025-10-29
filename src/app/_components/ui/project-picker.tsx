import React, { useEffect, useState, useRef, useMemo } from "react";
import { Badge, Separator, Button, Dialog, View } from "./index";
import { ProjectSearchInput } from "./project-search";

interface ProjectItem {
  id: string;
  worktree: string;
  vcs?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProjectPickerProps {
  projects: ProjectItem[];
  currentProject: ProjectItem | null;
  onSelect: (project: ProjectItem) => void;
  onClose: () => void;
}

export const ProjectPicker: React.FC<ProjectPickerProps> = ({
  projects,
  currentProject,
  onSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(() => {
    // Initialize with current project's index if it exists
    const currentIndex = projects.findIndex((p) => p.id === currentProject?.id);
    return currentIndex >= 0 ? currentIndex : 0;
  });
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const searchInputRef = useRef<{ focus: () => void }>(null);

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return projects;
    }
    return projects.filter((project) =>
      project.worktree.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
  }, [projects, searchQuery]);

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
        box="square"
        className="rounded border overflow-hidden shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto scrollbar"
        style={{
          backgroundColor: "var(--theme-background)",
          borderColor: "var(--theme-primary)",
          borderWidth: "1px",
        }}
      >
        <div className="p-4">
          <h2 className="text-lg font-bold mb-3">Projects</h2>
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
                  }}
                  onClick={() => {
                    onSelect(project);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {project.worktree}
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {project.createdAt?.toLocaleDateString() || "Unknown"}
                        {project.vcs && (
                          <span className="ml-2">
                            • VCS: {project.vcs}
                          </span>
                        )}
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
