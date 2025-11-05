import { createFileRoute } from "@tanstack/react-router";
import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  Button,
  Input,
  Textarea,
  View,
  Badge,
  Pre,
  Dialog,
  Separator,
  MobileSidebar,
  HamburgerMenu,
  InstallPrompt,
  PWAReloadPrompt,
  Checkbox,
  Spinner,

} from "@/app/_components/ui";
import { SidebarTabs } from "@/app/_components/ui/sidebar-tabs";
import { SessionContextPanel } from "@/app/_components/ui/session-context-panel";
import { McpStatusPanel } from "@/app/_components/ui/mcp-status-panel";
import { LspStatusPanel } from "@/app/_components/ui/lsp-status-panel";
import { ModifiedFilesPanel } from "@/app/_components/ui/modified-files-panel";
import { CommandPicker } from "@/app/_components/ui/command-picker";
import { AgentPicker } from "@/app/_components/ui/agent-picker";
import {
  SessionPicker,
  type SessionPickerEditControls,
} from "@/app/_components/ui/session-picker";
import { SessionSearchInput } from "@/app/_components/ui/session-search";
import { ProjectPicker } from "@/app/_components/ui/project-picker";
import { PermissionModal } from "@/app/_components/ui/permission-modal";
import { MessagePart } from "@/app/_components/message";
import { GENERIC_TOOL_TEXTS } from "@/app/_components/message/TextPart";
import { ImagePreview } from "@/app/_components/ui/image-preview";
import { PrettyDiff } from "@/app/_components/message/PrettyDiff";
import type {
  FileContentData,
  MentionSuggestion,
  Agent,
  ImageAttachment,
  Part,
} from "@/types/opencode";
import { FileIcon } from "@/app/_components/files/file-icon";
import { useOpenCodeContext } from "@/contexts/OpenCodeContext";
import { openCodeService, handleOpencodeError } from "@/lib/opencode-client";
import { parseCommand } from "@/lib/commandParser";
import {
  getCommandSuggestions,
  completeCommand,
  COMMANDS,
  type Command,
} from "@/lib/commands";
import { useTheme } from "@/hooks/useTheme";
import { themeList } from "@/lib/themes";
import {
  detectLanguage,
  highlightCode,
  isImageFile,
  addLineNumbers,
} from "@/lib/highlight";
import {
  convertImageToBase64,
  validateImageSize,
  formatFileSize,
  isImageFile as isAttachmentImageFile,
} from "@/lib/image-utils";
import { useIsMobile } from "@/lib/breakpoints";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardIndicator } from "@/app/_components/ui";
import "highlight.js/styles/github-dark.css";
import { getFeatureFlags } from "@/lib/config";
import { MarkdownRenderer } from "@/lib/markdown";

const MAX_IMAGE_SIZE_MB = 10;

type FileViewMode = "code" | "preview" | "diff";

// Commands that open pickers when executed
const PICKER_COMMANDS = ["models", "agents", "themes", "sessions"];

// Commands that take no arguments and execute immediately
const NO_ARG_COMMANDS = ["new", "clear", "undo", "redo", "share", "unshare", "init", "compact", "details", "export", "help"];

const RENDERABLE_PART_TYPES = new Set([
  "text",
  "reasoning",
  "tool",
  "file",
  "step-start",
  "step-finish",
  "patch",
  "agent",
  "snapshot",
]);

// UUID generator with fallback for environments without crypto.randomUUID
const generateClientId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: generate a random UUID v4-like string
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

type ProjectItem = {
  id: string;
  worktree: string;
  vcs?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

interface ProjectSelectorProps {
  projects: ProjectItem[];
  currentProject: ProjectItem | null;
  onSelect: (project: ProjectItem) => void;
  placeholder?: string;
  buttonClassName?: string;
}

function ProjectSelector({
  projects,
  currentProject,
  onSelect,
  placeholder = "Select a project",
  buttonClassName = "",
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedLabel = currentProject?.worktree || placeholder;
  const hasProject = !!currentProject;

  return (
    <div className="relative" ref={containerRef}>
      <Button
        box="square"
        className={`w-full flex items-center justify-between gap-2 text-sm ${buttonClassName} ${
          hasProject ? "[&]:!bg-[var(--theme-primary)] [&]:!text-[var(--theme-background)]" : "[&]:!bg-[var(--theme-background)] [&]:!text-[var(--theme-foreground)]"
        }`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          borderColor: "var(--theme-primary)",
          borderWidth: "1px",
          borderStyle: "solid",
        }}
      >
        <span className="truncate">
          {selectedLabel}
        </span>
        <span className="text-xs opacity-70">
          {isOpen ? "▲" : "▼"}
        </span>
      </Button>
      {isOpen && (
        <div
          className="absolute left-0 right-0 mt-2 rounded border shadow-lg overflow-hidden z-50"
          style={{
            backgroundColor: "var(--theme-background)",
            borderColor: "var(--theme-primary)",
          }}
          role="listbox"
        >
          {projects.length > 0 ? (
            <div className="max-h-64 overflow-y-auto scrollbar">
              {projects.map((project) => {
                const isSelected = currentProject?.id === project.id;
                return (
                  <div
                    key={project.id}
                    className="w-full px-3 py-2 text-sm transition-colors cursor-pointer"
                    style={{
                      backgroundColor: isSelected
                        ? "var(--theme-primary)"
                        : "var(--theme-background)",
                      color: isSelected
                        ? "var(--theme-background)"
                        : "var(--theme-foreground)",
                    }}
                    onClick={() => {
                      onSelect(project);
                      setIsOpen(false);
                    }}
                    onMouseEnter={(event) => {
                      if (!isSelected) {
                        event.currentTarget.style.backgroundColor =
                          "var(--theme-backgroundAlt)";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (!isSelected) {
                        event.currentTarget.style.backgroundColor =
                          "var(--theme-background)";
                      }
                    }}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(project);
                        setIsOpen(false);
                      }
                    }}
                  >
                    <div className="font-medium truncate">
                      {project.worktree}
                    </div>
                    <div className="text-xs opacity-70 truncate">
                      VCS: {project.vcs || "Unknown"}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-sm text-theme-muted">
              No projects found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function coerceToDate(value?: Date | string | number | null) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number" || typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function ThemePickerDialog({
  currentTheme,
  onThemeChange,
  onClose,
}: {
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Filter themes based on search query
  const filteredThemes = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return themeList;
    return themeList.filter(
      (theme) =>
        theme.name.toLowerCase().includes(query) ||
        theme.id.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Initialize: focus search input and scroll to current theme
  useEffect(() => {
    // Auto-focus search input
    searchInputRef.current?.focus();

    // Find current theme index and scroll to it
    const currentIndex = filteredThemes.findIndex(
      (theme) => theme.id === currentTheme
    );
    if (currentIndex !== -1) {
      setSelectedIndex(currentIndex);
      // Scroll to current theme after a brief delay to ensure DOM is ready
      setTimeout(() => {
        selectedItemRef.current?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update selected index when filtered themes change
  useEffect(() => {
    // Keep selection within bounds
    if (selectedIndex >= filteredThemes.length) {
      setSelectedIndex(Math.max(0, filteredThemes.length - 1));
    }
    // Reset to current theme when search is cleared
    if (!searchQuery && filteredThemes.length > 0) {
      const currentIndex = filteredThemes.findIndex(
        (theme) => theme.id === currentTheme
      );
      if (currentIndex !== -1) {
        setSelectedIndex(currentIndex);
      }
    }
  }, [filteredThemes, searchQuery, currentTheme, selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          // Circular navigation: wrap to start if at the end
          const newIndex = prev + 1 >= filteredThemes.length ? 0 : prev + 1;
          // Preview theme immediately
          onThemeChange(filteredThemes[newIndex].id);
          return newIndex;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          // Circular navigation: wrap to end if at the start
          const newIndex = prev - 1 < 0 ? filteredThemes.length - 1 : prev - 1;
          // Preview theme immediately
          onThemeChange(filteredThemes[newIndex].id);
          return newIndex;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredThemes[selectedIndex]) {
          onThemeChange(filteredThemes[selectedIndex].id);
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        // Restore original theme if user cancels
        onThemeChange(currentTheme);
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filteredThemes, selectedIndex, onThemeChange, onClose, currentTheme]);

  // Scroll selected item into view
  useEffect(() => {
    selectedItemRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedIndex]);

  return (
    <Dialog open={true} onClose={onClose}>
                  <View
                    box="round"
                    className="p-2 mb-2 bg-theme-background-alt"
                  >
        <h2 className="text-lg font-bold mb-4">Select Theme</h2>
        <Separator className="mb-4" />

        {/* Search Input */}
        <input
          ref={searchInputRef}
          type="text"
          is-="input"
          placeholder="Search themes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full mb-4"
        />

        {/* Theme List */}
        <div
          ref={listContainerRef}
          className="max-h-96 overflow-y-auto scrollbar space-y-2 mb-4"
        >
          {filteredThemes.length === 0 ? (
            <div className="text-center py-8 text-theme-muted">
              No themes found matching "{searchQuery}"
            </div>
          ) : (
            filteredThemes.map((theme, index) => (
              <div
                key={theme.id}
                ref={index === selectedIndex ? selectedItemRef : null}
                className={`p-3 rounded cursor-pointer transition-colors border ${
                  index === selectedIndex
                    ? "bg-theme-primary/20 border-theme-primary text-theme-foreground ring-2 ring-theme-primary/50"
                    : currentTheme === theme.id
                      ? "border-theme-primary/50 bg-theme-background-alt"
                      : "border-theme-border bg-theme-background-alt hover:bg-opacity-50"
                }`}
                onClick={() => {
                  setSelectedIndex(index);
                  onThemeChange(theme.id);
                  onClose();
                }}
                onMouseEnter={() => {
                  setSelectedIndex(index);
                  onThemeChange(theme.id);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{theme.name}</div>
                    <div className="text-xs opacity-70 mt-1">{theme.id}</div>
                  </div>
                  <div className="flex gap-1">
                    {Object.entries(theme.colors)
                      .slice(0, 5)
                      .map(([key, color]) => (
                        <div
                          key={key}
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: color }}
                          title={key}
                        />
                      ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <Separator className="mb-4" />

        {/* Footer with instructions */}
        <div className="text-xs text-theme-muted mb-3">
          <div className="flex gap-4">
            <span>↑↓ Navigate</span>
            <span>Enter Confirm</span>
            <span>Esc Cancel</span>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="background2"
            box="round"
            onClick={() => {
              // Restore original theme on close
              onThemeChange(currentTheme);
              onClose();
            }}
            size="small"
          >
            Close
          </Button>
        </div>
      </View>
    </Dialog>
  );
}

export const Route = createFileRoute("/")({
  component: OpenCodeChatTUI,
});

function OpenCodeChatTUI() {
  const [input, setInput] = useState("");
  const [isMultilineMode, setIsMultilineMode] = useState(false);
  const [multilineInput, setMultilineInput] = useState("");
  const [imageAttachments, setImageAttachments] = useState<ImageAttachment[]>([]);
  const [isHandlingImageUpload, setIsHandlingImageUpload] = useState(false);
  const [isDraggingOverInput, setIsDraggingOverInput] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  // Message history navigation state
  const [messageHistoryIndex, setMessageHistoryIndex] = useState(-1);
  const [isNavigatingHistory, setIsNavigatingHistory] = useState(false);
  const [draftBeforeHistory, setDraftBeforeHistory] = useState("");
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectDirectory, setNewProjectDirectory] = useState("");
  const closeNewProjectDialog = () => {
    setShowNewProjectForm(false);
    setNewProjectDirectory("");
  };
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const closeNewSessionDialog = () => {
    setShowNewSessionForm(false);
    setNewSessionTitle("");
  };
  const [sidebarEditMode, setSidebarEditMode] = useState(false);
  const [selectedSidebarSessionIds, setSelectedSidebarSessionIds] = useState<
    Set<string>
  >(new Set());
  const [mobileEditMode, setMobileEditMode] = useState(false);
  const [selectedMobileSessionIds, setSelectedMobileSessionIds] = useState<
    Set<string>
  >(new Set());
  const [isRefreshingSessions, setIsRefreshingSessions] = useState(false);
  const lastEscTimeRef = useRef<number>(0);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const storedTab = localStorage.getItem("opencode-active-tab");
      if (storedTab === "status") {
        return "workspace";
      }
      if (storedTab) {
        return storedTab;
      }
    }
    return "workspace";
  });
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const fileListRef = useRef<HTMLDivElement>(null);

  const [selectedFile, setSelectedFile] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("opencode-selected-file");
    }
    return null;
  });
  const [fileContent, setFileContent] = useState<FileContentData | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileViewMode, setFileViewMode] = useState<FileViewMode>("code");
  const [mentionSuggestions, setMentionSuggestions] = useState<
    MentionSuggestion[]
  >([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [commandSuggestions, setCommandSuggestions] = useState<Command[]>([]);
  const [showCommandPicker, setShowCommandPicker] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configData, setConfigData] = useState<string | null>(null);
  const [configSearchQuery, setConfigSearchQuery] = useState("");
  const [helpSearchQuery, setHelpSearchQuery] = useState("");
  const [deleteDialogState, setDeleteDialogState] = useState<{
    open: boolean;
    sessionId?: string;
    sessionTitle?: string;
  }>({ open: false });
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelSearchInputRef = useRef<HTMLInputElement>(null);
  const fileSearchInputRef = useRef<HTMLInputElement>(null);
  const workspaceSessionSearchInputRef = useRef<{ focus: () => void }>(null);
  const configSearchInputRef = useRef<HTMLInputElement>(null);
  const helpSearchInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionPickerEditControls =
    useRef<SessionPickerEditControls | null>(null);
  const isHistoryNavigationRef = useRef(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("opencode-sidebar-width");
      return stored ? parseInt(stored, 10) : 320;
    }
    return 320;
  });
  const [isStatusSidebarOpen, setIsStatusSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("opencode-status-sidebar-open");
      if (stored !== null) {
        return stored === "true";
      }
    }
    return true;
  });
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("opencode-left-sidebar-open");
      if (stored !== null) {
        return stored === "true";
      }
    }
    return true;
  });
  const [rightSidebarWidth, setRightSidebarWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("opencode-right-sidebar-width");
      return stored ? parseInt(stored, 10) : 320;
    }
    return 320;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isRightResizing, setIsRightResizing] = useState(false);
  const isMobile = useIsMobile();

  const selectedFileName = selectedFile?.split("/").pop() ?? null;
  const fileTextContent = fileContent?.text ?? null;
  const hasTextContent =
    fileTextContent !== null && fileTextContent !== undefined;
  const isBase64Encoded = fileContent?.encoding === "base64";
  const mimeType = fileContent?.mimeType?.toLowerCase() ?? "";
  const selectedFileIsImage =
    !!selectedFile && Boolean(isBase64Encoded) && isImageFile(selectedFile);
  const selectedFileIsPdf =
    Boolean(isBase64Encoded) && mimeType.startsWith("application/pdf");
  const hasBinaryDownload =
    !!fileContent &&
    Boolean(isBase64Encoded) &&
    !selectedFileIsImage &&
    !selectedFileIsPdf &&
    !hasTextContent;
  const showLanguageBadge =
    hasTextContent && !selectedFileIsImage && !selectedFileIsPdf;
  const showMimeTypeBadge =
    Boolean(fileContent?.mimeType) &&
    (selectedFileIsImage || selectedFileIsPdf || hasBinaryDownload);
  const copyButtonDisabled = !hasTextContent || Boolean(fileError);

  const triggerBinaryDownload = () => {
    if (!fileContent?.dataUrl) return;
    const link = document.createElement("a");
    link.href = fileContent.dataUrl;
    const downloadName = selectedFileName || "download";
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const {
    currentSession,
    messages,
    setMessages,
    sessions,
    sessionSearchQuery,
    setSessionSearchQuery,
    sessionFilters,
    setSessionFilters,
    filteredSessions,
    loading,
    isStreaming,
    createSession,
    sendMessage,
    loadSessions,
    loadMessages,
    switchSession,
    deleteSession,
    clearAllSessions: _clearAllSessions,
    // New features
    projects,
    currentProject,
    switchProject,
    files,
    fileDirectory,
    loadFiles,
    searchFiles,
    readFile,

    models,
    selectedModel,
    selectModel,
    recentModels,
    openHelp,
    openThemes,
    showToast,
    isConnected,
    sseConnectionState,
    isHydrated,
    showHelp,
    setShowHelp,
    showThemes,
    setShowThemes,
    showOnboarding,
    setShowOnboarding,
    showModelPicker,
    setShowModelPicker,
    agents,
    subagents,
    currentAgent,
    selectAgent,
    extractTextFromParts,
    runShell,
    revertMessage,
    unrevertSession,
    shareSession,
    unshareSession,
    initSession,
    summarizeSession,
    abortSession,
    currentSessionBusy,
    abortInFlight,
    currentPermission,
    setCurrentPermission,
    shouldBlurEditor,
    setShouldBlurEditor,
    currentSessionTodos,
    config,
    commands,
    executeSlashCommand,
    sessionUsage,
    messageQueue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    processNextInQueue: _processNextInQueue,
    isProcessingQueue: _isProcessingQueue,
    // Frame state for keyboard navigation
    selectedFrame,
    selectFrame,
    refreshStatusAll,
    sidebarStatus,
  } = useOpenCodeContext();
  const { currentTheme, changeTheme } = useTheme(config?.theme);
  const featureFlags = useMemo(() => getFeatureFlags(config), [config]);
  const selectedFileIsMarkdown =
    !!selectedFile &&
    (detectLanguage(selectedFile) === "markdown" ||
      fileContent?.mimeType?.toLowerCase() === "text/markdown");
  const canPreviewMarkdown =
    featureFlags.enableMarkdown &&
    selectedFileIsMarkdown &&
    !!fileContent?.text;

  const trimmedInput = input.trimStart();
  const isShellInput = trimmedInput.startsWith("!");
  const isSlashCommandInput = trimmedInput.startsWith("/");
  const shellTargetDirectory =
    currentProject?.worktree ||
    currentSession?.directory ||
    sessions.find((sessionItem) => sessionItem.id === currentSession?.id)
      ?.directory ||
    "";
  const shellDirectoryLabel =
    shellTargetDirectory && shellTargetDirectory.length > 0
      ? shellTargetDirectory
      : "session directory";



  // Build user message history for ArrowUp/ArrowDown navigation
  const userMessageHistory = useMemo(() => {
    return messages
      .filter((m) => m.type === "user" && m.content?.trim())
      .map((m) => m.content!.trim());
  }, [messages]);

  // Initialize keyboard shortcuts
  const {
    keyboardState,
    registerShortcut,
    setActiveModal,
    setSpacePassthrough,
  } = useKeyboardShortcuts();

  // Close all modals - ensures only one modal is open at a time
  const closeAllModals = useCallback(() => {
    setSpacePassthrough(false);
    setActiveModal(null);
    setShowCommandPicker(false);
    setShowAgentPicker(false);
    setShowSessionPicker(false);
    setShowProjectPicker(false);
    setShowConfig(false);
    setShowModelPicker(false);
    setShowThemes(false);
    setShowHelp(false);
    setShowOnboarding(false);
  }, [
    setActiveModal,
    setShowCommandPicker,
    setShowAgentPicker,
    setShowSessionPicker,
    setShowProjectPicker,
    setShowConfig,
    setShowModelPicker,
    setShowThemes,
    setShowHelp,
    setShowOnboarding,
    setSpacePassthrough,
  ]);

  const handleSessionPickerEditModeChange = useCallback(
    (isEditMode: boolean) => {
      setSpacePassthrough(isEditMode);
    },
    [setSpacePassthrough],
  );

  useEffect(() => {
    if (!showSessionPicker) {
      setSpacePassthrough(false);
    }
  }, [showSessionPicker, setSpacePassthrough]);

  useEffect(() => {
    if (!keyboardState.doubleEscapeTime) {
      return;
    }

    if (abortInFlight) {
      showToast("Agent interrupt already in progress");
      return;
    }

    if (currentSessionBusy && currentSession?.id) {
      showToast("Interrupting agent…");
      void abortSession(currentSession.id).catch(() => {
        showToast("Failed to interrupt agent");
      });
      return;
    }

    if (currentSession && !currentSessionBusy) {
      showToast("No running agent to interrupt");
    }
  }, [
    keyboardState.doubleEscapeTime,
    abortInFlight,
    currentSessionBusy,
    currentSession,
    abortSession,
    showToast,
  ]);

  // Auto-focus Help modal search input when opened
  useEffect(() => {
    if (showHelp) {
      requestAnimationFrame(() => {
        helpSearchInputRef.current?.focus();
      });
    }
  }, [showHelp]);

  // Auto-focus Config modal search input when opened
  useEffect(() => {
    if (showConfig) {
      requestAnimationFrame(() => {
        configSearchInputRef.current?.focus();
      });
    }
  }, [showConfig]);

  // Register keyboard shortcuts for frame navigation
  useEffect(() => {
    const unregisterFns: (() => void)[] = [];

    // Frame navigation shortcuts (require leader key)
    unregisterFns.push(
      registerShortcut({
        key: "p",
        handler: () => {
          closeAllModals();
          setShowProjectPicker(true);
        },
        requiresLeader: true,
        description: "Open Project Picker",
        category: "navigation",
      })
    );

    unregisterFns.push(
      registerShortcut({
        key: "s",
        handler: () => {
          closeAllModals();
          setShowSessionPicker(true);
        },
        requiresLeader: true,
        description: "Open Session Picker",
        category: "navigation",
      })
    );

    unregisterFns.push(
      registerShortcut({
        key: "f",
        handler: () => {
          // Toggle Files sidebar if already on Files tab, otherwise navigate to Files
          if (activeTab === "files" && isLeftSidebarOpen) {
            setIsLeftSidebarOpen(false);
          } else {
            setActiveTab("files");
            setIsLeftSidebarOpen(true);
            // Focus file list after opening
            setTimeout(() => {
              fileListRef.current?.focus();
            }, 100);
          }
          closeAllModals();
        },
        requiresLeader: true,
        description: "Toggle Files Sidebar",
        category: "navigation",
      })
    );

    // Files tab shortcuts (when files tab is active)
    unregisterFns.push(
      registerShortcut({
        key: "/",
        handler: () => {
          if (activeTab === "files") {
            fileSearchInputRef.current?.focus();
          } else if (activeTab === "workspace") {
            workspaceSessionSearchInputRef.current?.focus();
          }
        },
        requiresLeader: true,
        description: "Search Sessions/Files",
        category: "navigation",
      })
    );

    unregisterFns.push(
      registerShortcut({
        key: "r",
        handler: async () => {
          if (activeTab === "files") {
            try {
              await loadFiles(fileDirectory || ".");
              setSelectedFile(null);
              setFileContent(null);
              setFileError(null);
            } catch (err) {
              console.error("Failed to load directory:", err);
            }
          }
        },
        requiresLeader: true,
        description: "Refresh Files",
        category: "navigation",
      })
    );

    unregisterFns.push(
      registerShortcut({
        key: "u",
        handler: async () => {
          if (activeTab === "files" && fileDirectory !== ".") {
            const parts = fileDirectory.split("/").filter(Boolean);
            parts.pop();
            const parent = parts.length > 0 ? parts.join("/") : ".";
            try {
              await loadFiles(parent);
              setSelectedFile(null);
              setFileContent(null);
              setFileError(null);
            } catch (err) {
              console.error("Failed to load directory:", err);
            }
          }
        },
        requiresLeader: true,
        description: "Navigate Up Directory",
        category: "navigation",
      })
    );

    unregisterFns.push(
      registerShortcut({
        key: "w",
        handler: () => {
          handleTabChange("workspace");
          closeAllModals();
        },
        requiresLeader: true,
        description: "Toggle Workspace Sidebar",
        category: "navigation",
      })
    );

    unregisterFns.push(
      registerShortcut({
        key: "i",
        handler: () => {
          closeAllModals();
          setIsStatusSidebarOpen((prev) => !prev);
        },
        requiresLeader: true,
        description: "Toggle Info Panel",
        category: "navigation",
      })
    );

    unregisterFns.push(
      registerShortcut({
        key: "m",
        handler: () => {
          closeAllModals();
          setShowModelPicker(true);
        },
        requiresLeader: true,
        description: "Open Model Picker",
        category: "navigation",
      })
    );

    unregisterFns.push(
      registerShortcut({
        key: "a",
        handler: () => {
          closeAllModals();
          setShowAgentPicker(true);
        },
        requiresLeader: true,
        description: "Open Agent Picker",
        category: "navigation",
      })
    );

    unregisterFns.push(
      registerShortcut({
        key: "t",
        handler: () => {
          closeAllModals();
          setShowThemes(true);
        },
        requiresLeader: true,
        description: "Open Theme Picker",
        category: "navigation",
      })
    );

    unregisterFns.push(
      registerShortcut({
        key: "c",
        handler: () => {
          closeAllModals();
          setShowConfig(true);
        },
        requiresLeader: true,
        description: "Open Config",
        category: "navigation",
      })
    );

    unregisterFns.push(
      registerShortcut({
        key: "h",
        handler: () => {
          closeAllModals();
          setShowHelp(true);
        },
        requiresLeader: true,
        description: "Open Help Dialog",
        category: "navigation",
      })
    );



    // Secondary action shortcuts (require selected frame)
    unregisterFns.push(
      registerShortcut({
        key: "n",
        handler: () => {
          if (selectedFrame === "sessions") {
            setShowNewSessionForm(true);
          } else if (selectedFrame === "projects") {
            setShowNewProjectForm(true);
          }
        },
        requiresFrame: selectedFrame || undefined,
        description: "New (Project/Session)",
        category: "action",
      })
    );

    unregisterFns.push(
      registerShortcut({
        key: "e",
        handler: () => {
          if (selectedFrame === "sessions" && currentSession) {
            setSidebarEditMode(true);
          }
        },
        requiresFrame: "sessions",
        description: "Edit Session",
        category: "action",
      })
    );

    unregisterFns.push(
      registerShortcut({
        key: "d",
        handler: () => {
          if (selectedFrame === "sessions" && currentSession) {
            if (confirm("Are you sure you want to delete this session?")) {
              deleteSession(currentSession.id);
            }
          }
        },
        requiresFrame: "sessions",
        description: "Delete Session",
        category: "action",
      })
    );

    // Modal-specific shortcuts (work when modal is open)
    unregisterFns.push(
      registerShortcut({
        key: "n",
        handler: () => {
          setShowSessionPicker(false);
          setShowNewSessionForm(true);
        },
        requiresModal: "session",
        description: "New Session",
        category: "action",
      })
    );

    unregisterFns.push(
      registerShortcut({
        key: "e",
        handler: () => {
          sessionPickerEditControls.current?.enterEditMode();
        },
        requiresModal: "session",
        description: "Edit Session",
        category: "action",
      })
    );

    return () => {
      unregisterFns.forEach((fn) => fn());
    };
  }, [
    registerShortcut,
    selectFrame,
    selectedFrame,
    currentSession,
    setShowModelPicker,
    setShowAgentPicker,
    setShowThemes,
    setShowConfig,
    setShowHelp,
    setShowNewSessionForm,
    setShowNewProjectForm,
    setSidebarEditMode,
    deleteSession,
    setShowSessionPicker,
    setShowProjectPicker,
    closeAllModals,
    setIsStatusSidebarOpen,
    sessionPickerEditControls,
    activeTab,
    isLeftSidebarOpen,
    setActiveTab,
    setIsLeftSidebarOpen,
    fileDirectory,
    loadFiles,
    setSelectedFile,
    setFileContent,
    setFileError,
  ]);

  useLayoutEffect(() => {
    if (showSessionPicker) {
      setActiveModal("session");
      return;
    }

    if (showProjectPicker) {
      setActiveModal("project");
      return;
    }

    if (showAgentPicker) {
      setActiveModal("agent");
      return;
    }

    if (showModelPicker) {
      setActiveModal("model");
      return;
    }

    if (showThemes) {
      setActiveModal("theme");
      return;
    }

    if (showConfig) {
      setActiveModal("config");
      return;
    }

    if (showCommandPicker) {
      setActiveModal("command");
      return;
    }

    if (showHelp) {
      setActiveModal("help");
      return;
    }

    setActiveModal(null);
  }, [
    showSessionPicker,
    showProjectPicker,
    showAgentPicker,
    showModelPicker,
    showThemes,
    showConfig,
    showCommandPicker,
    showHelp,
    setActiveModal,
  ]);

  useEffect(() => {
    if (!showConfig) {
      return;
    }

    let canceled = false;
    setConfigData(null);

    (async () => {
      try {
        const config = await openCodeService.getConfig();
        if (!canceled) {
          setConfigData(JSON.stringify(config, null, 2));
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load config:", error);
        }
        if (!canceled) {
          setConfigData("Unable to load configuration.");
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, [showConfig]);

  // Handle frame navigation and actions
  useEffect(() => {
    if (selectedFrame === "projects") {
      // Scroll to projects section - it's in the sidebar
      const projectsHeading = Array.from(document.querySelectorAll('h3')).find(h => h.textContent === 'Projects');
      if (projectsHeading) {
        projectsHeading.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else if (selectedFrame === "sessions") {
      // Scroll to sessions section - it's in the sidebar
      const sessionsHeading = Array.from(document.querySelectorAll('h3')).find(h => h.textContent === 'Sessions');
      if (sessionsHeading) {
        sessionsHeading.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else if (selectedFrame === "files") {
      // Switch to files tab and ensure sidebar is visible
      setActiveTab("files");
      setIsLeftSidebarOpen(true);
    } else if (selectedFrame === "workspace") {
      // Switch to workspace tab and focus on input area; ensure sidebar is visible
      setActiveTab("workspace");
      setIsLeftSidebarOpen(true);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  }, [selectedFrame]);

  // Handle secondary actions based on selected frame
  useEffect(() => {
    const handleFrameAction = (action: string) => {
      if (!selectedFrame) return;

      switch (selectedFrame) {
        case "sessions":
          if (action === "new") {
            setShowNewSessionForm(true);
          } else if (action === "edit") {
            // Enable edit mode for current session
            if (currentSession) {
              setSidebarEditMode(true);
            }
          } else if (action === "delete") {
            // Delete current session
            if (currentSession && confirm("Are you sure you want to delete this session?")) {
              deleteSession(currentSession.id);
            }
          }
          break;
        case "projects":
          if (action === "new") {
            setShowNewProjectForm(true);
          }
          break;
      }
      
      // Clear frame selection after action
      selectFrame(null);
    };

    // Listen for frame actions (this will be triggered by keyboard shortcuts)
    const handleFrameActionEvent = (event: CustomEvent) => {
      handleFrameAction(event.detail.action);
    };

    window.addEventListener("frame-action", handleFrameActionEvent as EventListener);
    
    return () => {
      window.removeEventListener("frame-action", handleFrameActionEvent as EventListener);
    };
  }, [selectedFrame, currentSession, deleteSession, selectFrame]);

  const customCommandSuggestions = useMemo<Command[]>(() => {
    if (!commands || commands.length === 0) return [];

    return commands.map((cmd) => ({
      name: cmd.name,
      description: cmd.description || "Custom command",
      category: "custom" as const,
      custom: true,
    }));
  }, [commands]);

  // Removed automatic session creation to prevent spam

  const handleSend = async () => {
    if (isHandlingImageUpload) {
      await showToast("Still processing images. Please wait a moment.", "info");
      return;
    }

    const messageText = input;
    const trimmedText = messageText.trim();
    const attachmentsToSend = imageAttachments.map((attachment) => ({
      ...attachment,
    }));
    const hasAttachments = attachmentsToSend.length > 0;
    const hasText = trimmedText.length > 0;

    if (!hasText && !hasAttachments) {
      return;
    }

    if (!hasAttachments) {
      const parsed = parseCommand(messageText, commands);

      if (parsed.type === "slash") {
        setInput("");
        await handleCommand(messageText);
        return;
      }

      if (parsed.type === "shell") {
        setInput("");
        await handleShellCommand(parsed.command || "");
        return;
      }
    }

    setInput("");
    if (hasAttachments) {
      setImageAttachments([]);
    }
    
    // Reset history navigation state when sending a message
    setMessageHistoryIndex(-1);
    setIsNavigatingHistory(false);
    setDraftBeforeHistory("");

    const messageParts: Part[] = [];

    if (hasText) {
      messageParts.push({
        type: "text",
        text: messageText,
      });
    }

    attachmentsToSend.forEach((attachment) => {
      messageParts.push({
        type: "file",
        path: attachment.name,
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
        content: attachment.dataUrl,
        origin: attachment.origin,
      } as Part);
    });

    try {
      // Session creation is now handled by sendMessage hook (issue #59)
      // Only pass sessionOverride if we have a currentSession
      const sessionOverride = currentSession || undefined;

      const isBusy = loading || isStreaming || currentSessionBusy;

      if (isBusy) {
        const queuedMessage = {
          id: `queued-${Date.now()}`,
          clientId: generateClientId(),
          type: "user" as const,
          content: messageText,
          parts: messageParts,
          timestamp: new Date(),
          queued: true,
          optimistic: true,
        };
        addToQueue(queuedMessage);
        setMessages((prev) => [...prev, queuedMessage]);
      } else {
        const pendingId = `user-${Date.now()}`;
        const clientId = generateClientId();
        setMessages((prev) => [
          ...prev,
          {
            id: pendingId,
            clientId,
            type: "user" as const,
            content: messageText,
            parts: messageParts,
            timestamp: new Date(),
            optimistic: true,
          },
        ]);

        try {
          await sendMessage(messageText, {
            providerID: selectedModel?.providerID,
            modelID: selectedModel?.modelID,
            sessionOverride,
            agent: currentAgent ?? undefined,
            parts: messageParts,
          });
        } catch (error) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.optimistic ? { ...msg, optimistic: false, error: true } : msg,
            ),
          );
          throw error;
        }
      }

      await loadSessions();
    } catch (err) {
      console.error("Failed to send message:", err);
      if (attachmentsToSend.length > 0) {
        setImageAttachments((prev) => [...attachmentsToSend, ...prev]);
      }
    }
  };

  const handleAbort = async () => {
    if (!currentSession?.id || abortInFlight) return;

    try {
      await abortSession(currentSession.id);

      const successMsg = {
        id: `assistant-${Date.now()}`,
        type: "assistant" as const,
        content: "Agent stopped by user.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMsg]);
    } catch (error) {
      const errorMsg = {
        id: `assistant-${Date.now()}`,
        type: "assistant" as const,
        content: `Failed to stop agent: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleRightResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRightResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth);
        localStorage.setItem("opencode-sidebar-width", newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (!isRightResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setRightSidebarWidth(newWidth);
        if (typeof window !== "undefined") {
          localStorage.setItem("opencode-right-sidebar-width", newWidth.toString());
        }
      }
    };

    const handleMouseUp = () => {
      setIsRightResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isRightResizing]);

  useEffect(() => {
    if (
      !showModelPicker &&
      !showAgentPicker &&
      !showSessionPicker &&
      textareaRef.current &&
      currentSession
    ) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showModelPicker, showAgentPicker, showSessionPicker, currentSession]);

  useEffect(() => {
    if (textareaRef.current && isHydrated && currentSession) {
      textareaRef.current.focus();
    }
  }, [isHydrated, currentSession?.id]);

  useEffect(() => {
    if (!loading && textareaRef.current && currentSession) {
      textareaRef.current.focus();
    }
  }, [loading, currentSession]);

  // Reset history navigation state when session changes or messages are cleared
  const messagesEmpty = messages.length === 0;
  useEffect(() => {
    setMessageHistoryIndex(-1);
    setIsNavigatingHistory(false);
    setDraftBeforeHistory("");
  }, [currentSession?.id, messagesEmpty]);

  const handleShellCommand = async (command: string) => {
    if (!currentSession) {
      const errorMsg = {
        id: `assistant-${Date.now()}`,
        type: "assistant" as const,
        content: "No active session. Create a session first.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      return;
    }

    try {
      const userMessage = {
        id: `user-${Date.now()}`,
        clientId: generateClientId(),
        type: "user" as const,
        content: `$ ${command}`,
        timestamp: new Date(),
        optimistic: true, // Mark as optimistic so SSE events can match it
        shellCommand: command,
      };
      setMessages((prev) => [...prev, userMessage]);

      const response = await runShell(currentSession.id, command, []);

      if (response.data) {
        const assistantMessage = {
          id: response.data.info.id,
          type: "assistant" as const,
          content: extractTextFromParts(response.data.parts),
          parts: response.data.parts,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Failed to execute shell command:", error);
      const errorMsg = {
        id: `assistant-${Date.now()}`,
        type: "assistant" as const,
        content: `Command failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleCommand = async (command: string) => {
    const parsed = parseCommand(command, commands);
    const cmd = parsed.command;
    const _args = parsed.args; // Preserved for future commands with args
    const directory = currentProject?.worktree || "";

    if (parsed.matchedCommand) {
      try {
        await executeSlashCommand(parsed, currentSession?.id);
        await loadSessions();
      } catch (error) {
        const errorMsg = {
          id: `assistant-${Date.now()}`,
          type: "assistant" as const,
          content: `Command failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
      return;
    }

    switch (cmd) {
      case "new":
      case "clear":
        await createSession({ title: "New Session" });
        const newMessage = {
          id: `assistant-${Date.now()}`,
          type: "assistant" as const,
          content: "Started new session.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, newMessage]);
        break;
      case "models":
        setInput("");
        closeAllModals();
        setShowModelPicker(true);
        break;
      case "help":
        setInput("");
        closeAllModals();
        setShowHelp(true);
        break;
      case "themes":
        setInput("");
        closeAllModals();
        setShowThemes(true);
        break;
      case "sessions":
        setInput("");
        closeAllModals();
        setShowSessionPicker(true);
        break;
      case "project":
        setInput("");
        closeAllModals();
        setShowProjectPicker(true);
        break;
      case "agents":
        setInput("");
        closeAllModals();
        setShowAgentPicker(true);
        break;
      case "undo":
        if (!currentSession || messages.length === 0) {
          const errorMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: "No messages to undo.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          break;
        }

        try {
          const lastAssistantMsg = [...messages]
            .reverse()
            .find((m) => m.type === "assistant");

          if (!lastAssistantMsg) {
            throw new Error("No assistant message to revert");
          }

          await revertMessage(currentSession.id, lastAssistantMsg.id);
          await loadSessions();

          const successMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: "Undid last message and reverted file changes.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, successMsg]);

          if (activeTab === "files") {
            await loadFiles(fileDirectory);
          }
        } catch (error) {
          const errorMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: `Undo failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
        break;
      case "redo":
        if (!currentSession) {
          const errorMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: "No active session.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          break;
        }

        try {
          await unrevertSession(currentSession.id);
          await loadSessions();

          const successMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: "Restored reverted changes.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, successMsg]);

          if (activeTab === "files") {
            await loadFiles(fileDirectory);
          }
        } catch (error) {
          const errorMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: `Redo failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
        break;
      case "share":
        if (!currentSession) {
          const errorMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: "No active session to share.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          break;
        }

        try {
          const sharedSession = await shareSession(currentSession.id);

          const shareUrl = sharedSession?.share?.url || "No URL available";

          await navigator.clipboard.writeText(shareUrl);

          const successMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: `Session shared.\n\nURL: ${shareUrl}\n\n(Copied to clipboard)`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, successMsg]);

          await loadSessions();
        } catch (error) {
          const errorMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: `Share failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
        break;
      case "unshare":
        if (!currentSession) {
          const errorMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: "No active session.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          break;
        }

        try {
          await unshareSession(currentSession.id);

          const successMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: "Session is no longer shared.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, successMsg]);

          await loadSessions();
        } catch (error) {
          const errorMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: `Unshare failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
        break;
      case "init":
        if (!currentSession || !selectedModel) {
          const errorMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: "Need an active session and selected model.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          break;
        }

        try {
          const lastMessage = messages[messages.length - 1];
          const messageID = lastMessage?.id || "";

          await initSession(
            currentSession.id,
            messageID,
            selectedModel.providerID,
            selectedModel.modelID,
          );

          const successMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content:
              "Project initialized. AGENTS.md has been created or updated.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, successMsg]);

          if (activeTab === "files") {
            await loadFiles(fileDirectory);
          }
        } catch (error) {
          const errorMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: `Init failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
        break;
      case "compact":
        if (!currentSession) {
          const errorMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: "No active session to compact.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          break;
        }

        if (!selectedModel) {
          const errorMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: "No model selected. Please select a model first.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          break;
        }

        try {
          const infoMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: "Compacting session... This may take a moment.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, infoMsg]);

          if (process.env.NODE_ENV !== "production")
            console.log(
              "[Compact] Starting compaction for session:",
              currentSession.id,
            );
          if (process.env.NODE_ENV !== "production")
            console.log("[Compact] Messages before:", messages.length);
          if (process.env.NODE_ENV !== "production")
            console.log(
              "[Compact] Tokens before:",
              messages.reduce((sum, msg) => {
                if (msg.metadata?.tokens) {
                  return (
                    sum +
                    msg.metadata.tokens.input +
                    msg.metadata.tokens.output +
                    msg.metadata.tokens.reasoning
                  );
                }
                return sum;
              }, 0),
            );

          await summarizeSession(
            currentSession.id,
            selectedModel.providerID,
            selectedModel.modelID,
          );
          if (process.env.NODE_ENV !== "production")
            console.log(
              "[Compact] Summarization request sent, polling for completion...",
            );

          // Poll until we see token count decrease (or timeout after 30 seconds)
          const startTime = Date.now();
          const maxWaitTime = 30000; // 30 seconds
          const tokensBefore = messages.reduce((sum, msg) => {
            if (msg.metadata?.tokens) {
              return (
                sum +
                msg.metadata.tokens.input +
                msg.metadata.tokens.output +
                msg.metadata.tokens.reasoning
              );
            }
            return sum;
          }, 0);

          let reloadedMessages = messages;
          let totalTokens = tokensBefore;
          let pollAttempt = 0;

          while (
            totalTokens >= tokensBefore &&
            Date.now() - startTime < maxWaitTime
          ) {
            pollAttempt++;
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second between polls

            if (process.env.NODE_ENV !== "production")
              console.log(`[Compact] Poll attempt ${pollAttempt}...`);
            reloadedMessages = await loadMessages(currentSession.id);

            totalTokens = reloadedMessages.reduce((sum, msg) => {
              if (msg.metadata?.tokens) {
                return (
                  sum +
                  msg.metadata.tokens.input +
                  msg.metadata.tokens.output +
                  msg.metadata.tokens.reasoning
                );
              }
              return sum;
            }, 0);

            if (process.env.NODE_ENV !== "production")
              console.log(
                `[Compact] Current tokens: ${totalTokens} (before: ${tokensBefore})`,
              );
          }

          if (totalTokens >= tokensBefore) {
            if (process.env.NODE_ENV !== "production")
              console.warn("[Compact] Timeout waiting for token reduction");
          } else {
            if (process.env.NODE_ENV !== "production")
              console.log(
                `[Compact] Token reduction detected after ${pollAttempt} polls`,
              );
          }

          if (process.env.NODE_ENV !== "production")
            console.log(
              "[Compact] Messages reloaded:",
              reloadedMessages.length,
            );
          if (process.env.NODE_ENV !== "production")
            console.log(
              "[Compact] Total tokens after compaction:",
              totalTokens,
            );

          // Add success message using the reloaded messages array
          const successMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: `Session compacted successfully. Current tokens: ${totalTokens.toLocaleString()}`,
            timestamp: new Date(),
          };
          setMessages([...reloadedMessages, successMsg]);
        } catch (error) {
          const errorMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: `Compact failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
        break;
      case "details":
        setShowDetails((prev) => !prev);
        const detailsMsg = {
          id: `assistant-${Date.now()}`,
          type: "assistant" as const,
          content: `Details ${!showDetails ? "shown" : "hidden"}.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, detailsMsg]);
        break;
      case "export":
        if (!currentSession || messages.length === 0) {
          const errorMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: "No session to export.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          break;
        }

        try {
          let markdown = `# ${currentSession.title || currentSession.id}\n\n`;
          markdown += `Project: ${currentProject?.worktree || "Unknown"}\n`;
          markdown += `Created: ${currentSession.createdAt?.toLocaleString() || "Unknown"}\n`;
          markdown += `Messages: ${messages.length}\n\n`;
          markdown += `---\n\n`;

          messages.forEach((msg, idx) => {
            const role = msg.type === "user" ? "**User**" : "**Assistant**";
            markdown += `## Message ${idx + 1} - ${role}\n\n`;
            markdown += `_${msg.timestamp.toLocaleString()}_\n\n`;

            if (msg.parts && msg.parts.length > 0) {
              msg.parts.forEach((part) => {
                if (part.type === "text" && "text" in part) {
                  markdown += `${part.text}\n\n`;
                } else if (part.type === "tool" && "tool" in part) {
                  markdown += `**Tool:** ${part.tool}\n`;
                  if (
                    "state" in part &&
                    part.state &&
                    typeof part.state === "object" &&
                    "status" in part.state
                  ) {
                    markdown += `**Status:** ${part.state.status}\n\n`;
                  }
                }
              });
            } else {
              markdown += `${msg.content}\n\n`;
            }

            markdown += `---\n\n`;
          });

          const blob = new Blob([markdown], { type: "text/markdown" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${currentSession.title || "session"}-${Date.now()}.md`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          const successMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: "Session exported as markdown.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, successMsg]);
        } catch (error) {
          const errorMsg = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
        break;
      case "debug":
        try {
          if (!currentSession) {
            const noSessionMsg = {
              id: `assistant-${Date.now()}`,
              type: "assistant" as const,
              content: "No active session to debug.",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, noSessionMsg]);
            break;
          }

          // Proxy through server to avoid direct browser access to OpenCode API
          const sessionResult = await openCodeService.getSession(
            currentSession.id,
            directory,
          );
          const sessionData = sessionResult.data;

          // Proxy through server to avoid direct browser access to OpenCode API
          const messagesResult = await openCodeService.getMessages(
            currentSession.id,
            directory,
          );
          const messagesData = messagesResult.data;

          const fullData = {
            session: sessionData,
            messages: messagesData,
            timestamp: new Date().toISOString(),
          };

          // Download as JSON file
          const blob = new Blob([JSON.stringify(fullData, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `SESSION-${currentSession.id}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          const debugMessage = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: `Session data exported to SESSION-${currentSession.id}.json\n\nIncludes:\n- Session metadata\n- ${messagesData.length} messages with full parts\n- All tool executions and state`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, debugMessage]);
        } catch (error) {
          const errorMessage = {
            id: `assistant-${Date.now()}`,
            type: "assistant" as const,
            content: `Debug export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
        break;
      default:
        const unknownMessage = {
          id: `assistant-${Date.now()}`,
          type: "assistant" as const,
          content: `Unknown command: ${cmd}. Type /help for available commands.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, unknownMessage]);
    }
  };

  const handleCreateSession = async () => {
    const title = newSessionTitle.trim() || "New Session";
    const directory = currentProject?.worktree || "";
    if (!directory) {
      if (process.env.NODE_ENV !== "production")
        console.warn("Select a project before creating a session.");
      return;
    }
    try {
      await createSession({ title, directory });
      await loadSessions();
      closeNewSessionDialog();
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const handleCreateProject = async () => {
    const directory = newProjectDirectory.trim();
    if (!directory) return;
    const projectLabel =
      directory.split(/[\\/]/).filter(Boolean).pop() || "New Project";
    const title = `${projectLabel} session`;
    try {
      await createSession({ title, directory });
      await loadSessions();
      closeNewProjectDialog();
      setNewSessionTitle("");
    } catch (err) {
      console.error("Failed to create project session:", err);
    }
  };

  const handleSessionSwitch = async (sessionId: string) => {
    try {
      await switchSession(sessionId);
    } catch (err) {
      console.error("Failed to switch session:", err);
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialogState.sessionId) return;

    try {
      await deleteSession(deleteDialogState.sessionId);
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      setDeleteDialogState({ open: false });
    }
  };

  const handleBulkDeleteClick = (sessionIds: string[]) => {
    setBulkDeleteIds(sessionIds);
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    const results = await Promise.allSettled(
      bulkDeleteIds.map((id) => deleteSession(id)),
    );

    const failures = results.filter((r) => r.status === "rejected");

    if (failures.length > 0) {
      console.error(`Failed to delete ${failures.length} sessions`);
    }

    await loadSessions();

    setBulkDeleteDialogOpen(false);
    setBulkDeleteIds([]);
  };

  const handleSidebarEditToggle = () => {
    if (sidebarEditMode) {
      // Exiting edit mode - clear selection
      setSelectedSidebarSessionIds(new Set());
    }
    setSidebarEditMode(!sidebarEditMode);
  };

  const handleSessionsRefresh = useCallback(async () => {
    if (!currentProject || isRefreshingSessions) return;
    setIsRefreshingSessions(true);
    try {
      await loadSessions({ force: true });
    } catch (error) {
      console.error("Failed to refresh sessions:", error);
      await showToast("Failed to refresh sessions", "error");
    } finally {
      setIsRefreshingSessions(false);
    }
  }, [currentProject, isRefreshingSessions, loadSessions, showToast]);

  const handleSidebarSessionToggle = (sessionId: string) => {
    setSelectedSidebarSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleSidebarSelectAll = () => {
    const projectSessions = filteredSessions.filter(
      (session) =>
        session.projectID === currentProject?.id ||
        session.directory === currentProject?.worktree,
    );
    setSelectedSidebarSessionIds(new Set(projectSessions.map((s) => s.id)));
  };

  const handleSidebarClearSelection = () => {
    setSelectedSidebarSessionIds(new Set());
  };

  const handleSidebarBulkDelete = async () => {
    const count = selectedSidebarSessionIds.size;
    if (count === 0) return;

    if (
      confirm(
        `Are you sure you want to delete ${count} session${count > 1 ? "s" : ""}?`,
      )
    ) {
      try {
        const deletePromises = Array.from(selectedSidebarSessionIds).map((id) =>
          deleteSession(id),
        );
        await Promise.allSettled(deletePromises);
        await loadSessions();
        setSelectedSidebarSessionIds(new Set());
        setSidebarEditMode(false);
      } catch (err) {
        console.error("Failed to delete sessions:", err);
      }
    }
  };

  // Mobile edit mode handlers
  const handleMobileEditToggle = () => {
    if (mobileEditMode) {
      setSelectedMobileSessionIds(new Set());
    }
    setMobileEditMode(!mobileEditMode);
  };

  const handleMobileSessionToggle = (sessionId: string) => {
    setSelectedMobileSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleMobileSelectAll = () => {
    const projectSessions = filteredSessions.filter(
      (session) =>
        session.projectID === currentProject?.id ||
        session.directory === currentProject?.worktree,
    );
    setSelectedMobileSessionIds(new Set(projectSessions.map((s) => s.id)));
  };

  const handleMobileClearSelection = () => {
    setSelectedMobileSessionIds(new Set());
  };

  const handleMobileBulkDelete = async () => {
    const count = selectedMobileSessionIds.size;
    if (count === 0) return;

    if (
      confirm(
        `Are you sure you want to delete ${count} session${count > 1 ? "s" : ""}?`,
      )
    ) {
      try {
        const deletePromises = Array.from(selectedMobileSessionIds).map((id) =>
          deleteSession(id),
        );
        await Promise.allSettled(deletePromises);
        await loadSessions();
        setSelectedMobileSessionIds(new Set());
        setMobileEditMode(false);
      } catch (err) {
        console.error("Failed to delete sessions:", err);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      // Shift+Enter enables multi-line mode for shell commands
      const parsed = parseCommand(input, commands);
      if (parsed.type === "shell" && !isMultilineMode) {
        setIsMultilineMode(true);
        setMultilineInput(input);
      } else {
        // Add newline at cursor position
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newValue = input.substring(0, start) + "\n" + input.substring(end);
          setInput(newValue);
          // Position cursor after the newline
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(start + 1, start + 1);
            }
          });
        }
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showCommandPicker && commandSuggestions.length > 0) {
        handleCommandSelect(commandSuggestions[selectedCommandIndex]);
      } else if (showMentionSuggestions && mentionSuggestions.length > 0) {
        handleMentionSelect(mentionSuggestions[selectedMentionIndex]);
      } else {
        // Check if this is a shell command that might be multi-line
        const parsed = parseCommand(input, commands);
        if (parsed.type === "shell" && isMultilineMode) {
          // In multi-line mode, Ctrl+Enter sends, regular Enter adds newline
          if (e.ctrlKey) {
            handleSend();
          } else {
            // Add newline at cursor position
            const textarea = textareaRef.current;
            if (textarea) {
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const newValue = input.substring(0, start) + "\n" + input.substring(end);
              setInput(newValue);
              // Position cursor after the newline
              requestAnimationFrame(() => {
                if (textareaRef.current) {
                  textareaRef.current.setSelectionRange(start + 1, start + 1);
                }
              });
            }
          }
        } else {
          handleSend();
        }
      }
    }
    if (e.key === "Tab") {
      e.preventDefault();
      if (showCommandPicker && commandSuggestions.length > 0) {
        // Use the currently selected command instead of common prefix
        const selectedCommand = commandSuggestions[selectedCommandIndex];
        if (selectedCommand) {
          // Check if it's a picker command that should execute immediately
          const commandName = selectedCommand.name;

          if (PICKER_COMMANDS.includes(commandName) || NO_ARG_COMMANDS.includes(commandName)) {
            // Execute immediately for picker and no-arg commands
            handleCommandSelect(selectedCommand);
          } else {
            // For custom commands, just complete and wait for user input
            setInput(`/${selectedCommand.name} `);
            setShowCommandPicker(false);
          }
        }
      } else if (input.startsWith("/")) {
        const completed = completeCommand(input, customCommandSuggestions);
        if (completed) {
          // Check if it's a picker command that should execute immediately
          const commandName = completed.slice(1); // Remove leading /
          
          if (PICKER_COMMANDS.includes(commandName) || NO_ARG_COMMANDS.includes(commandName)) {
            // Execute immediately for picker and no-arg commands
            setInput("");
            void handleCommand(completed);
          } else {
            // For custom commands, just complete and wait for user input
            setInput(completed + " ");
          }
        }
      } else {
        cycleAgent();
      }
    }
    if (e.key === "ArrowDown") {
      if (showCommandPicker) {
        e.preventDefault();
        // Circular navigation: wrap to first item when reaching the end
        setSelectedCommandIndex((prev) =>
          (prev + 1) % commandSuggestions.length
        );
      } else if (showMentionSuggestions) {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < mentionSuggestions.length - 1 ? prev + 1 : prev,
        );
      } else if (
        isNavigatingHistory &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        // History navigation: ArrowDown moves forward (toward more recent)
        e.preventDefault();
        
        if (messageHistoryIndex > 0) {
          const newIndex = messageHistoryIndex - 1;
          setMessageHistoryIndex(newIndex);
          const historyMessage = userMessageHistory[userMessageHistory.length - 1 - newIndex];
          
          // Mark that we're programmatically changing input
          isHistoryNavigationRef.current = true;
          setInput(historyMessage);
          
          // Place cursor at end of text
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              const len = historyMessage.length;
              textareaRef.current.setSelectionRange(len, len);
            }
            isHistoryNavigationRef.current = false;
          });
        } else {
          // Exit history navigation and restore draft
          setMessageHistoryIndex(-1);
          setIsNavigatingHistory(false);
          
          // Mark that we're programmatically changing input
          isHistoryNavigationRef.current = true;
          setInput(draftBeforeHistory);
          setDraftBeforeHistory("");
          
          // Place cursor at end
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              const len = draftBeforeHistory.length;
              textareaRef.current.setSelectionRange(len, len);
            }
            isHistoryNavigationRef.current = false;
          });
        }
      }
    }
    if (e.key === "ArrowUp") {
      if (showCommandPicker) {
        e.preventDefault();
        // Circular navigation: wrap to last item when moving past the beginning
        setSelectedCommandIndex((prev) => 
          (prev - 1 + commandSuggestions.length) % commandSuggestions.length
        );
      } else if (showMentionSuggestions) {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        userMessageHistory.length > 0
      ) {
        // History navigation: ArrowUp moves backward into history
        e.preventDefault();
        
        // Save draft before entering history navigation
        if (!isNavigatingHistory) {
          setDraftBeforeHistory(input);
          setIsNavigatingHistory(true);
        }
        
        const newIndex = Math.min(
          messageHistoryIndex + 1,
          userMessageHistory.length - 1,
        );
        setMessageHistoryIndex(newIndex);
        const historyMessage = userMessageHistory[userMessageHistory.length - 1 - newIndex];
        
        // Mark that we're programmatically changing input
        isHistoryNavigationRef.current = true;
        setInput(historyMessage);
        
        // Place cursor at end of text
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            const len = historyMessage.length;
            textareaRef.current.setSelectionRange(len, len);
          }
          isHistoryNavigationRef.current = false;
        });
      }
    }
    if (e.key === "Escape") {
      if (showCommandPicker) {
        e.preventDefault();
        setShowCommandPicker(false);
      } else if (showMentionSuggestions) {
        e.preventDefault();
        setShowMentionSuggestions(false);
      } else if (keyboardState.leaderActive) {
        // Deactivate leader mode if it's active
        e.preventDefault();
        // This will be handled by the keyboard manager
      } else {
        // Handle double ESC for agent interruption (desktop only)
        const now = Date.now();
        const timeSinceLastEsc = now - lastEscTimeRef.current;
        
        if (timeSinceLastEsc < 500 && currentSessionBusy && !isMobile) {
          // Double ESC detected - interrupt agent
          e.preventDefault();
          handleAbort();
          lastEscTimeRef.current = 0; // Reset timer
        } else {
          // Single ESC - blur focused element or prepare for double ESC
          lastEscTimeRef.current = now;
          
          // Blur any focused element that's not the body
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && activeElement !== document.body) {
            activeElement.blur();
          }
          
          // Clear the timer after the threshold
          setTimeout(() => {
            if (lastEscTimeRef.current === now) {
              lastEscTimeRef.current = 0;
            }
          }, 500);
        }
      }
    }
  };

  const searchAgents = (
    query: string,
    agents: Agent[],
  ): MentionSuggestion[] => {
    const lowerQuery = query.toLowerCase();
    return agents
      .filter((agent: Agent) => {
        const nameMatch = agent.name?.toLowerCase().includes(lowerQuery);
        const descMatch = agent.description?.toLowerCase().includes(lowerQuery);
        return nameMatch || descMatch;
      })
      .map((agent: Agent) => ({
        type: "agent" as const,
        name: agent.name,
        description: agent.description,
        label: `${agent.name} (agent)`,
      }))
      .slice(0, 5);
  };

  const handleMentionSelect = (suggestion: MentionSuggestion) => {
    const currentValue = input || "";
    const beforeAt = currentValue.substring(0, currentValue.lastIndexOf("@"));

    if (suggestion.type === "agent") {
      // Insert @agent-name with trailing space
      const newValue = `${beforeAt}@${suggestion.name} `;
      setInput(newValue);
    } else {
      // Insert @file/path with trailing space
      const newValue = `${beforeAt}@${suggestion.path} `;
      setInput(newValue);
    }

    setShowMentionSuggestions(false);
    inputRef.current?.focus();
  };

  const handleInputChange = async (value: string) => {
    setInput(value);
    
    // Reset history navigation if user is actually typing (not programmatic change)
    if (!isHistoryNavigationRef.current && isNavigatingHistory) {
      setMessageHistoryIndex(-1);
      setIsNavigatingHistory(false);
      setDraftBeforeHistory("");
    }
    
    if (value.startsWith("/")) {
      if (process.env.NODE_ENV !== "production") {
        console.log("Commands from context:", commands);
        console.log("Custom commands list:", customCommandSuggestions);
      }
      const suggestions = getCommandSuggestions(
        value,
        customCommandSuggestions,
      );
      if (process.env.NODE_ENV !== "production")
        console.log("All suggestions:", suggestions);
      setCommandSuggestions(suggestions);
      setShowCommandPicker(suggestions.length > 0);
      setSelectedCommandIndex(0);
    } else {
      setShowCommandPicker(false);
    }

    if (value.includes("@")) {
      const query = value.split("@").pop() || "";
      try {
        // Parallel fetch: agents first, then files (matching TUI order)
        const [agentResults, fileResults] = await Promise.all([
          Promise.resolve(searchAgents(query, subagents)),
          searchFiles(query).then((files) =>
            files
              .slice(0, 5)
              .map((f) => ({ type: "file" as const, path: f, label: f })),
          ),
        ]);

        // Agents first in combined list
        const combined = [...agentResults, ...fileResults];
        setMentionSuggestions(combined);
        setShowMentionSuggestions(true);
      } catch (error) {
        console.error("Failed to search mentions:", error);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const removeImageAttachment = useCallback((id: string) => {
    setImageAttachments((prev) =>
      prev.filter((attachment) => attachment.id !== id),
    );
    
    // Reset history navigation when attachments change
    setMessageHistoryIndex(-1);
    setIsNavigatingHistory(false);
    setDraftBeforeHistory("");
  }, []);

  const handleImageAttachments = useCallback(
    async (files: File[], origin: "paste" | "drop") => {
      if (files.length === 0) return;

      setIsHandlingImageUpload(true);

      try {
        const processed = await Promise.all(
          files.map(async (file, index) => {
            if (!validateImageSize(file, MAX_IMAGE_SIZE_MB)) {
              await showToast(
                `${file.name || "Image"} is ${formatFileSize(file.size)}. Maximum size is ${MAX_IMAGE_SIZE_MB} MB.`,
                "error",
              );
              return null;
            }

            try {
              const dataUrl = await convertImageToBase64(file);
              const mimeType =
                file.type ||
                dataUrl.match(/^data:([^;]+);/)?.[1] ||
                "application/octet-stream";
              const extension =
                mimeType.split("/")[1]?.split("+")[0] || "png";
              const prefix = origin === "paste" ? "pasted-image" : "dropped-image";
              const safeName =
                file.name && file.name.trim().length > 0
                  ? file.name
                  : `${prefix}-${Date.now()}-${index + 1}.${extension}`;

              const attachment: ImageAttachment = {
                id: generateClientId(),
                name: safeName,
                mimeType,
                size: file.size,
                dataUrl,
                origin,
              };

              return attachment;
            } catch (error) {
              console.error("Failed to convert image to base64:", error);
              await showToast(
                `Failed to read ${file.name || "image file"}.`,
                "error",
              );
              return null;
            }
          }),
        );

        const validAttachments = processed.filter(
          (attachment): attachment is ImageAttachment => Boolean(attachment),
        );

        if (validAttachments.length > 0) {
          setImageAttachments((prev) => [...prev, ...validAttachments]);
          
          // Reset history navigation when attachments change
          setMessageHistoryIndex(-1);
          setIsNavigatingHistory(false);
          setDraftBeforeHistory("");
        }
      } finally {
        setIsHandlingImageUpload(false);
      }
    },
    [showToast],
  );

  const handlePaste = async (
    event: React.ClipboardEvent<HTMLTextAreaElement>,
  ) => {
    const items = Array.from(event.clipboardData?.items ?? []);
    if (items.length === 0) return;

    const imageFiles: File[] = [];

    items.forEach((item) => {
      if (item.kind !== "file") return;
      const file = item.getAsFile();
      if (!file) return;
      if (isAttachmentImageFile(file)) {
        imageFiles.push(file);
      }
    });

    if (imageFiles.length === 0) {
      if (items.some((item) => item.kind === "file")) {
        await showToast(
          "Only PNG, JPEG, GIF, and WebP images are supported.",
          "warning",
        );
      }
      return;
    }

    event.preventDefault();
    await handleImageAttachments(imageFiles, "paste");
  };

  const handleDragEnter = (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverInput(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsDraggingOverInput(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }
    setIsDraggingOverInput(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverInput(false);

    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length === 0) return;

    const imageFiles = files.filter((file) => isAttachmentImageFile(file));

    if (imageFiles.length === 0) {
      await showToast(
        "Only PNG, JPEG, GIF, and WebP images are supported.",
        "warning",
      );
      return;
    }

    await handleImageAttachments(imageFiles, "drop");
  };

  const handleCommandSelect = (command: Command) => {
    setShowCommandPicker(false);

    if (command.custom) {
      setInput("");
      void handleCommand(`/${command.name}`);
    } else if (command.name === "models") {
      setInput("");
      setShowModelPicker(true);
    } else if (command.name === "themes") {
      setInput("");
      setShowThemes(true);
    } else if (command.name === "help") {
      setInput("");
      setShowHelp(true);
    } else if (command.name === "sessions") {
      setInput("");
      setShowSessionPicker(true);
    } else if (command.name === "agents") {
      setInput("");
      setShowAgentPicker(true);
    } else if (NO_ARG_COMMANDS.includes(command.name)) {
      setInput("");
      void handleCommand(`/${command.name}`);
    } else {
      setInput(`/${command.name} `);
    }
  };

  // New feature handlers
  const handleProjectSwitch = async (project: (typeof projects)[0]) => {
    try {
      await switchProject(project);
    } catch (err) {
      console.error("Failed to switch project:", err);
    }
  };

  const handleFileSelect = async (filePath: string) => {
    setActiveTab("files");
    setIsLeftSidebarOpen(true);
    setIsMobileSidebarOpen(false);
    setFileViewMode("code"); // Reset to code view when selecting a new file

    try {
      const result = await readFile(filePath);
      setSelectedFile(filePath);
      if (result) {
        setFileContent(result);
        setFileError(null);
        // Auto-show diff if file has changes
        if (result.diff) {
          setFileViewMode("diff");
        }
      } else {
        setFileContent(null);
        setFileError("Unable to read file");
      }
    } catch (err) {
      console.error("Failed to read file:", err);
      setFileContent(null);
      setFileError("Error reading file");
    }
  };

  const handleDirectoryOpen = async (path: string) => {
    try {
      await loadFiles(path);
      setSelectedFile(null);
      setFileContent(null);
      setFileError(null);
    } catch (err) {
      console.error("Failed to load directory:", err);
    }
  };

  const handleNavigateUp = async () => {
    if (fileDirectory === ".") return;
    const parts = fileDirectory.split("/").filter(Boolean);
    parts.pop();
    const parent = parts.length > 0 ? parts.join("/") : ".";
    await handleDirectoryOpen(parent);
  };

  const breadcrumbParts = useMemo<string[]>(() => {
    if (!fileDirectory || fileDirectory === ".") {
      return [];
    }
    return fileDirectory.split("/").filter(Boolean);
  }, [fileDirectory]);

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === "directory" ? -1 : 1;
    });
  }, [files]);

  const filteredFiles = useMemo(() => {
    if (!fileSearchQuery.trim()) return sortedFiles;
    const query = fileSearchQuery.toLowerCase();
    return sortedFiles.filter(
      (file) =>
        file.name.toLowerCase().includes(query) ||
        file.path.toLowerCase().includes(query),
    );
  }, [sortedFiles, fileSearchQuery]);

  const filteredConfigData = useMemo(() => {
    if (!configData || !configSearchQuery.trim()) return configData;
    
    try {
      const parsed = JSON.parse(configData);
      const query = configSearchQuery.toLowerCase();
      
      // Simple jq-like filtering: filter object by keys/values matching query
      const filterObject = (obj: any, path = ""): any => {
        if (typeof obj !== "object" || obj === null) {
          // Check if primitive value matches
          const strValue = String(obj).toLowerCase();
          return strValue.includes(query) ? obj : null;
        }
        
        if (Array.isArray(obj)) {
          const filtered = obj.map((item, idx) => filterObject(item, `${path}[${idx}]`)).filter(item => item !== null);
          return filtered.length > 0 ? filtered : null;
        }
        
        const result: any = {};
        let hasMatch = false;
        
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          const keyMatches = key.toLowerCase().includes(query);
          const pathMatches = currentPath.toLowerCase().includes(query);
          
          if (keyMatches || pathMatches) {
            result[key] = value;
            hasMatch = true;
          } else {
            const filteredValue = filterObject(value, currentPath);
            if (filteredValue !== null) {
              result[key] = filteredValue;
              hasMatch = true;
            }
          }
        }
        
        return hasMatch ? result : null;
      };
      
      const filtered = filterObject(parsed);
      return filtered ? JSON.stringify(filtered, null, 2) : "No matches found";
    } catch (err) {
      // If not valid JSON, fall back to simple text search
      if (configData.toLowerCase().includes(configSearchQuery.toLowerCase())) {
        return configData;
      }
      return "No matches found";
    }
  }, [configData, configSearchQuery]);

  const helpCommands = useMemo(() => [
    { category: "Session", command: "/new", description: "Start a new session" },
    { category: "Session", command: "/clear", description: "Clear current session" },
    { category: "Session", command: "/sessions", description: "View all sessions" },
    { category: "Model", command: "/models", description: "Open model picker" },
    { category: "Model", command: "/model <provider>/<model>", description: "Select specific model" },
    { category: "Agent", command: "/agents", description: "Select agent" },
    { category: "Theme", command: "/themes", description: "Open theme picker" },
    { category: "File Operations", command: "/undo", description: "Undo last file changes" },
    { category: "File Operations", command: "/redo", description: "Redo last undone changes" },
    { category: "Other", command: "/help", description: "Show this help dialog" },
    { category: "Other", command: "/share", description: "Share current session" },
    { category: "Other", command: "/export", description: "Export session" },
    { category: "Other", command: "/debug", description: "Export session data (JSON)" },
  ], []);

  const filteredHelpCommands = useMemo(() => {
    if (!helpSearchQuery.trim()) return helpCommands;
    
    const query = helpSearchQuery.toLowerCase();
    return helpCommands.filter(cmd =>
      cmd.command.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query) ||
      cmd.category.toLowerCase().includes(query)
    );
  }, [helpCommands, helpSearchQuery]);

  const groupedHelpCommands = useMemo(() => {
    const groups: Record<string, typeof helpCommands> = {};
    for (const cmd of filteredHelpCommands) {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    }
    return groups;
  }, [filteredHelpCommands]);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aDate = a.updatedAt || a.createdAt || new Date(0);
      const bDate = b.updatedAt || b.createdAt || new Date(0);
      return bDate.getTime() - aDate.getTime();
    });
  }, [projects]);
  const currentProjectLastTouched = useMemo(() => {
    const updated = coerceToDate(
      currentProject?.updatedAt as Date | string | number | null,
    );
    if (updated) return updated;
    return coerceToDate(
      currentProject?.createdAt as Date | string | number | null,
    );
  }, [currentProject]);

  const filteredModels = useMemo(() => {
    if (!modelSearchQuery.trim()) return models;
    const query = modelSearchQuery.toLowerCase();
    return models.filter(
      (model) =>
        model.name.toLowerCase().includes(query) ||
        model.providerID.toLowerCase().includes(query) ||
        model.modelID.toLowerCase().includes(query),
    );
  }, [models, modelSearchQuery]);

  const sessionTokenStats = useMemo(() => {
    // Read from session-scoped cache instead of reducing messages
    const totalTokens = sessionUsage?.totalTokens || 0;

    const contextWindow = 200000;
    const contextPercentage =
      contextWindow > 0 ? Math.round((totalTokens / contextWindow) * 100) : 0;

    return {
      totalTokens,
      contextPercentage,
      contextWindow,
      // Optionally expose breakdown for future UI enhancements
      breakdown: sessionUsage
        ? {
            input: sessionUsage.input,
            output: sessionUsage.output,
            reasoning: sessionUsage.reasoning,
            cacheRead: sessionUsage.cacheRead,
            cacheWrite: sessionUsage.cacheWrite,
          }
        : null,
    };
  }, [sessionUsage]);

  const currentSessionLabel =
    currentSession?.title?.trim() || currentSession?.id?.slice(0, 8);

  const handleTabChange = (tab: string) => {
    // If clicking the same tab that's already active, toggle sidebar visibility
    if (tab === activeTab && isLeftSidebarOpen) {
      if (tab === "workspace") {
        // Workspace: only toggle sidebar, keep activeTab set to preserve chat
        setIsLeftSidebarOpen(false);
        return;
      }
      // Other tabs (Files, etc.): toggle sidebar and clear activeTab
      setIsLeftSidebarOpen(false);
      setActiveTab(""); // Clear active tab when hiding sidebar
      return;
    }
    
    // Otherwise, switch tabs and ensure sidebar is open
    setActiveTab(tab);
    setIsLeftSidebarOpen(true);
    
    if (tab === "files") {
      if (files.length === 0) {
        void handleDirectoryOpen(fileDirectory || ".");
      }
      // Focus the file list container when switching to files tab
      setTimeout(() => {
        fileListRef.current?.focus();
      }, 0);
    }
    if (tab === "workspace") {
      void loadSessions();
    }
  };

  const cycleAgent = () => {
    if (agents.length === 0) return;
    let currentIndex = 0;
    if (currentAgent) {
      const currentId = currentAgent.id || currentAgent.name;
      currentIndex = agents.findIndex((a) => {
        const agentId = a.id || a.name;
        return agentId === currentId;
      });
      if (currentIndex === -1) currentIndex = 0;
    }
    const nextIndex = (currentIndex + 1) % agents.length;
    selectAgent(agents[nextIndex]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (showModelPicker && modelSearchInputRef.current) {
      modelSearchInputRef.current.focus();
    }
  }, [showModelPicker]);

  useEffect(() => {
    if (showConfig) {
      const handleKeyDown = (e: KeyboardEvent) => {
        // / to focus config search
        if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement !== configSearchInputRef.current) {
          e.preventDefault();
          configSearchInputRef.current?.focus();
        }
      };
      
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [showConfig]);

  useEffect(() => {
    if (showHelp) {
      const handleKeyDown = (e: KeyboardEvent) => {
        // / to focus help search
        if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement !== helpSearchInputRef.current) {
          e.preventDefault();
          helpSearchInputRef.current?.focus();
        }
      };
      
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [showHelp]);

  useEffect(() => {
    setSelectedModelIndex(0);
  }, [modelSearchQuery]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("opencode-active-tab", activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("opencode-status-sidebar-open", String(isStatusSidebarOpen));
    }
  }, [isStatusSidebarOpen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("opencode-left-sidebar-open", String(isLeftSidebarOpen));
    }
  }, [isLeftSidebarOpen]);

  useEffect(() => {
    if (isStatusSidebarOpen) {
      void refreshStatusAll();
    }
  }, [isStatusSidebarOpen, refreshStatusAll]);

  useEffect(() => {
    if (!isMobile && activeTab === "status") {
      setActiveTab("workspace");
    }
  }, [isMobile, activeTab]);

  // Focus file list when files tab becomes active
  useEffect(() => {
    if (activeTab === "files" && isLeftSidebarOpen) {
      setTimeout(() => {
        fileListRef.current?.focus();
      }, 0);
    }
  }, [activeTab, isLeftSidebarOpen]);

  // Reset selected file index when filtered files change
  useEffect(() => {
    setSelectedFileIndex(0);
  }, [filteredFiles.length, fileDirectory]);

  // Scroll focused file into view
  useEffect(() => {
    if (activeTab === "files" && filteredFiles.length > 0) {
      const fileList = fileListRef.current;
      if (fileList) {
        const fileItems = fileList.querySelectorAll('[data-file-item]');
        const selectedItem = fileItems[selectedFileIndex] as HTMLElement;
        if (selectedItem) {
          selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
    }
  }, [selectedFileIndex, activeTab, filteredFiles]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (selectedFile) {
        localStorage.setItem("opencode-selected-file", selectedFile);
      } else {
        localStorage.removeItem("opencode-selected-file");
      }
    }
  }, [selectedFile]);

  useEffect(() => {
    const restoreFilesTab = async () => {
      if (isHydrated && activeTab === "files") {
        if (process.env.NODE_ENV !== "production")
          console.log("[Hydration] Restoring files tab state");
        if (files.length === 0) {
          if (process.env.NODE_ENV !== "production")
            console.log(
              "[Hydration] Loading files for directory:",
              fileDirectory,
            );
          await loadFiles(fileDirectory || ".");
        }
        if (selectedFile && !fileContent && !fileError) {
          if (process.env.NODE_ENV !== "production")
            console.log(
              "[Hydration] Restoring selected file content:",
              selectedFile,
            );
          await handleFileSelect(selectedFile);
        }
      }
    };
    void restoreFilesTab();
  }, [isHydrated, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setFileViewMode("code");
  }, [selectedFile, fileContent?.text]);

  if (!isHydrated) {
    return (
      <View
        box="square"
        className="h-screen font-mono overflow-hidden flex items-center justify-center bg-theme-background text-theme-foreground"
      >
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-lg">Loading OC Web...</div>
        </div>
      </View>
    );
  }

  return (
    <View
      box="square"
      className="font-mono overflow-hidden flex flex-col bg-theme-background text-theme-foreground"
      style={{
        height: "100dvh",
        width: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {/* Top Bar */}
      <div className="px-2 sm:px-4 py-2 flex items-center justify-between bg-theme-background-alt flex-shrink-0 gap-2 min-h-[48px]">
        {isConnected === false && (
          <div className="absolute top-0 left-0 right-0 px-2 py-1 text-center text-xs bg-theme-error text-theme-background z-50">
            Disconnected from OpenCode server
          </div>
        )}
        <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 overflow-hidden">
          <HamburgerMenu
            isOpen={isMobileSidebarOpen}
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          />
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
            <Badge
              variant="foreground0"
              cap="square"
              className="whitespace-nowrap flex-shrink-0 badge-title"
            >
              oc web
            </Badge>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <SidebarTabs
              tabs={[
                { id: "workspace", label: "Workspace" },
                { id: "files", label: "Files" },
              ]}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
            <Button
              variant={isStatusSidebarOpen ? "foreground0" : "foreground1"}
              box="round"
              size="small"
              className="hidden md:inline-flex"
              onClick={() => setIsStatusSidebarOpen((prev) => !prev)}
              aria-pressed={isStatusSidebarOpen}
              title={isStatusSidebarOpen ? "Hide info panel (Space+I)" : "Show info panel (Space+I)"}
            >
              Info
            </Button>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Button
            variant={showHelp ? "foreground0" : "foreground1"}
            box="round"
            onClick={openHelp}
            size="small"
            className="whitespace-nowrap"
            aria-pressed={showHelp}
            title={showHelp ? "Close help" : "Open help (Space+H)"}
          >
            Help
          </Button>
          <Button
            variant={showThemes ? "foreground0" : "foreground1"}
            box="round"
            onClick={openThemes}
            size="small"
            className="whitespace-nowrap"
            aria-pressed={showThemes}
            title={showThemes ? "Close themes" : "Open themes (Space+T)"}
          >
            Themes
          </Button>
          <Button
            variant={showConfig ? "foreground0" : "foreground1"}
            box="round"
            onClick={() => {
              closeAllModals();
              setShowConfig(true);
            }}
            size="small"
            className="whitespace-nowrap"
            aria-pressed={showConfig}
            title={showConfig ? "Close config" : "Open config (Space+C)"}
          >
            Config
          </Button>
        </div>
      </div>

      <Separator />

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex overflow-hidden gap-0">
        {/* Desktop Sidebar - hidden on mobile */}
        {isLeftSidebarOpen && (
          <View
            box="square"
            className="hidden md:flex flex-col p-4 bg-theme-background-alt relative"
            style={{ width: `${sidebarWidth}px` }}
          >
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-theme-primary transition-colors z-10"
            onMouseDown={handleResizeStart}
            style={{
              backgroundColor: isResizing
                ? "var(--theme-primary)"
                : "transparent",
            }}
          />
          <div className="flex-1 overflow-hidden">
            {/* Tab Panels */}
            {activeTab === "workspace" && (
              <div className="h-full flex flex-col overflow-hidden">
                {/* Projects Section */}
                <div className="flex flex-col flex-shrink-0">
                  <View
                    className="p-1 mb-1 bg-theme-background-alt"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium">Projects</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="foreground1"
                          box="round"
                          size="small"
                          onClick={() => setShowProjectPicker(true)}
                          title="Search projects"
                        >
                          Search
                        </Button>
                        <Button
                          variant={showNewProjectForm ? "foreground0" : "foreground1"}
                          box="round"
                          size="small"
                          onClick={() => {
                            setNewProjectDirectory("");
                            setShowNewProjectForm(true);
                          }}
                          aria-pressed={showNewProjectForm}
                          title="Create new project"
                        >
                          New
                        </Button>
                      </div>
                    </div>
                  </View>
                  <div className="flex-1 flex flex-col gap-3">
                    <ProjectSelector
                      projects={sortedProjects}
                      currentProject={currentProject}
                      onSelect={handleProjectSwitch}
                      buttonClassName="!py-2 !px-3"
                    />
                    {currentProject ? null : (
                      <div className="text-xs text-theme-muted">
                        {sortedProjects.length > 0
                          ? "Choose a project from the menu above."
                          : "No projects yet. Use New to add an existing git repository."}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sessions Section */}
                <div className="flex flex-col flex-1 min-h-0 mt-2">
                  <View
                    className="p-1 mb-1 bg-theme-background-alt"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <h3 className="text-sm font-medium">Sessions</h3>
                        <Button
                          variant="background2"
                          box="round"
                          onClick={handleSessionsRefresh}
                          size="small"
                          className="h-7 w-7 p-0 flex items-center justify-center border-none"
                          disabled={!currentProject || isRefreshingSessions}
                          aria-label="Refresh sessions"
                          title="Refresh sessions"
                        >
                          {isRefreshingSessions ? (
                            <Spinner size="small" className="h-3 w-3" />
                          ) : (
                            <span aria-hidden="true" className="text-sm">↻</span>
                          )}
                          <span className="sr-only">Refresh sessions</span>
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="foreground1"
                          box="round"
                          onClick={handleSidebarEditToggle}
                          size="small"
                          disabled={!currentProject}
                        >
                          {sidebarEditMode ? "Done" : "Edit"}
                        </Button>
                        <Button
                          variant={showNewSessionForm ? "foreground0" : "foreground1"}
                          box="round"
                          onClick={() => {
                            setNewSessionTitle("");
                            setShowNewSessionForm(true);
                          }}
                          size="small"
                          disabled={!currentProject}
                          aria-pressed={showNewSessionForm}
                          title="Create new session"
                        >
                          New
                        </Button>
                      </div>
                    </div>
                  </View>
                  {!currentProject ? (
                    <div className="flex-1 flex items-center justify-center text-sm text-theme-muted">
                      Select a project or use New Project to view sessions
                    </div>
                  ) : (
                    <>
                      {/* Sidebar Search Input */}
                      <div className="mt-2 mb-2">
                        <SessionSearchInput
                          ref={workspaceSessionSearchInputRef}
                          value={sessionSearchQuery}
                          onChange={setSessionSearchQuery}
                          onClear={() => setSessionSearchQuery("")}
                        />
                      </div>
                      {sidebarEditMode && (
                        <>
                           <div className="flex items-center justify-between gap-2 p-2 bg-theme-background-alt rounded mb-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="foreground1"
                                box="round"
                                size="small"
                                onClick={handleSidebarSelectAll}
                              >
                                Select All
                              </Button>
                              <Button
                                variant="foreground2"
                                box="round"
                                size="small"
                                onClick={handleSidebarClearSelection}
                                disabled={selectedSidebarSessionIds.size === 0}
                              >
                                Clear
                              </Button>
                            </div>
                             <Button
                               variant="foreground2"
                               box="round"
                               size="small"
                               onClick={handleSidebarBulkDelete}
                               disabled={selectedSidebarSessionIds.size === 0}
                               className={`sidebar-delete-button ${selectedSidebarSessionIds.size > 0 ? 'dangerous-bulk-delete' : ''}`}
                              >
                                <span className={selectedSidebarSessionIds.size > 0 ? 'text-red-500' : ''}>
                                  Delete{selectedSidebarSessionIds.size > 0 ? ` (${selectedSidebarSessionIds.size})` : ""}
                                </span>
                             </Button>
                          </div>
                          <Separator className="mb-2" />
                        </>
                      )}
                      <div className="flex-1 overflow-y-auto scrollbar-hidden space-y-1 min-h-0" data-sessions-list>
                        {filteredSessions
                          .filter(
                            (session) =>
                              session.projectID === currentProject?.id ||
                              session.directory === currentProject?.worktree,
                          )
                          .map((session) => {
                            const isSelected =
                              currentSession?.id === session.id;
                            const isChecked = selectedSidebarSessionIds.has(
                              session.id,
                            );
                            return (
                              <div
                                key={session.id}
                                className="pl-2 pr-0 py-2 cursor-pointer transition-colors rounded"
                                style={{
                                  backgroundColor: sidebarEditMode
                                    ? isChecked
                                      ? "rgba(from var(--theme-primary) r g b / 0.15)"
                                      : "var(--theme-background)"
                                    : isSelected
                                      ? "var(--theme-primary)"
                                      : "var(--theme-background)",
                                  color: sidebarEditMode
                                    ? "var(--theme-foreground)"
                                    : isSelected
                                      ? "var(--theme-background)"
                                      : "var(--theme-foreground)",
                                  border: sidebarEditMode
                                    ? `1px solid ${isChecked ? "var(--theme-primary)" : "var(--theme-borderSubtle)"}`
                                    : "1px solid transparent",
                                }}
                                onClick={() =>
                                  sidebarEditMode
                                    ? handleSidebarSessionToggle(session.id)
                                    : handleSessionSwitch(session.id)
                                }
                                onMouseEnter={(e) => {
                                  if (sidebarEditMode) {
                                    if (!isChecked) {
                                      e.currentTarget.style.backgroundColor =
                                        "var(--theme-backgroundAlt)";
                                    }
                                    return;
                                  }

                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor =
                                      "var(--theme-backgroundAlt)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (sidebarEditMode) {
                                    e.currentTarget.style.backgroundColor = isChecked
                                      ? "rgba(from var(--theme-primary) r g b / 0.15)"
                                      : "var(--theme-background)";
                                    return;
                                  }

                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor =
                                      "var(--theme-background)";
                                  }
                                }}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  {sidebarEditMode && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="mt-1 flex-shrink-0"
                                    >
                                      <Checkbox
                                        checked={isChecked}
                                        onChange={() =>
                                          handleSidebarSessionToggle(session.id)
                                        }
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                      {session.title}
                                    </div>
                                    <div className="text-xs opacity-70">
                                      {session.createdAt?.toLocaleDateString() ||
                                        "Unknown"}
                                      {session.messageCount !== undefined && (
                                        <span className="ml-2">
                                          • {session.messageCount} messages
                                        </span>
                                      )}
                                      {session.updatedAt && (
                                        <span className="ml-2">
                                          • Updated:{" "}
                                          {session.updatedAt.toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                    {session.directory && (
                                      <div className="text-xs opacity-50 truncate">
                                        Dir: {session.directory}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        {sessions.length === 0 && (
                          <div className="text-center text-sm py-4 text-theme-muted">
                            No sessions for this project yet
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

          {activeTab === "files" && (
              <div className="space-y-4 h-full flex flex-col">
                <View box="square" className="p-2 mb-2 bg-theme-background-alt">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Files</h3>
                     <Button
                       variant="foreground1"
                       box="round"
                       size="small"
                       onClick={() =>
                         void handleDirectoryOpen(fileDirectory || ".")
                       }
                    >
                      Refresh
                    </Button>
                  </div>
                </View>
                <Separator />
                <div className="space-y-2">
                  <Input
                    ref={fileSearchInputRef}
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    placeholder="Search files..."
                    size="small"
                    className="w-full bg-theme-background text-theme-foreground border-theme-primary"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs text-theme-foreground gap-2">
                  <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
                    <Button
                      box="square"
                      size="small"
                      onClick={() => void handleDirectoryOpen(".")}
                      className="!py-1 !px-2 text-xs"
                    >
                      root
                    </Button>
                    {breadcrumbParts.map((part, index) => {
                      const fullPath = breadcrumbParts
                        .slice(0, index + 1)
                        .join("/");
                      return (
                        <span
                          key={fullPath}
                          className="flex items-center gap-1"
                        >
                          <span className="text-theme-muted">/</span>
                          <Button
                    box="round"
                            size="small"
                            onClick={() => void handleDirectoryOpen(fullPath)}
                            className="!py-1 !px-2 text-xs"
                          >
                            {part}
                          </Button>
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {fileSearchQuery && (
                       <Button
                         variant="foreground1"
                         box="round"
                         size="small"
                         onClick={() => setFileSearchQuery("")}
                      >
                        Clear
                      </Button>
                    )}
                     <Button
                       variant="foreground1"
                       box="round"
                       size="small"
                       disabled={
                         fileDirectory === "." || breadcrumbParts.length === 0
                       }
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void handleNavigateUp();
                      }}
                      className="disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Up
                    </Button>
                  </div>
                </div>
                <Separator />
                <div
                  ref={fileListRef}
                  className="flex-1 overflow-y-auto scrollbar space-y-0.5"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (filteredFiles.length === 0) return;
                    
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSelectedFileIndex((prev) =>
                        prev < filteredFiles.length - 1 ? prev + 1 : prev
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSelectedFileIndex((prev) => (prev > 0 ? prev - 1 : prev));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      const file = filteredFiles[selectedFileIndex];
                      if (file) {
                        if (file.type === "directory") {
                          void handleDirectoryOpen(file.path);
                        } else {
                          void handleFileSelect(file.path);
                        }
                      }
                    } else if (e.key === "/" || e.key === "s") {
                      // Allow search shortcuts
                      e.stopPropagation();
                      fileSearchInputRef.current?.focus();
                    }
                  }}
                  style={{
                    outline: "none",
                  }}
                >
                  {filteredFiles.length > 0 ? (
                    filteredFiles.map((file, index) => {
                      const isDirectory = file.type === "directory";
                      const isSelected =
                        !isDirectory && selectedFile === file.path;
                      const isFocused = index === selectedFileIndex;
                      return (
                        <div
                          key={file.path}
                          data-file-item
                          className="px-2 py-1 cursor-pointer transition-colors rounded"
                          style={{
                            backgroundColor: isFocused
                              ? "var(--theme-primary)"
                              : isSelected
                                ? "rgba(from var(--theme-primary) r g b / 0.3)"
                                : "var(--theme-background)",
                            color: isFocused
                              ? "var(--theme-background)"
                              : "var(--theme-foreground)",
                            border: isFocused
                              ? "1px solid var(--theme-primary)"
                              : "1px solid transparent",
                          }}
                          onClick={() => {
                            setSelectedFileIndex(index);
                            if (isDirectory) {
                              void handleDirectoryOpen(file.path);
                            } else {
                              void handleFileSelect(file.path);
                            }
                          }}
                          onMouseEnter={(e) => {
                            setSelectedFileIndex(index);
                            if (!isFocused) {
                              e.currentTarget.style.backgroundColor =
                                "var(--theme-backgroundAlt)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isFocused) {
                              e.currentTarget.style.backgroundColor = isSelected
                                ? "rgba(from var(--theme-primary) r g b / 0.3)"
                                : "var(--theme-background)";
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <FileIcon
                              node={{
                                path: file.path,
                                type: isDirectory ? "directory" : "file",
                              }}
                            />
                            <span className="truncate">{file.name}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-sm py-4 text-theme-muted">
                      No files loaded
                    </div>
                  )}
                </div>
                <div className="text-xs opacity-50">
                  Path: {fileDirectory === "." ? "/" : `/${fileDirectory}`} •{" "}
                  {filteredFiles.length} items
                </div>
              </div>
            )}
          </div>
        </View>
        )}

        {/* Mobile Sidebar Drawer */}
        <MobileSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        >
          {/* Mobile Menu Actions */}
          <div className="flex gap-2 mb-4 flex-shrink-0">
            <Button
              variant="foreground0"
              box="round"
              onClick={() => {
                openHelp();
                setIsMobileSidebarOpen(false);
              }}
              size="small"
              className="flex-1"
            >
              Help
            </Button>
            <Button
              variant="foreground0"
              box="round"
              onClick={() => {
                openThemes();
                setIsMobileSidebarOpen(false);
              }}
              size="small"
              className="flex-1"
            >
              Themes
            </Button>
          </div>

          {/* Mobile Tab Navigation */}
          <div className="mb-4 flex-shrink-0">
            <SidebarTabs
              tabs={[
                { id: "workspace", label: "Workspace" },
                { id: "files", label: "Files" },
                { id: "status", label: "Info" },
              ]}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>

          {activeTab === "workspace" && (
            <div className="h-full flex flex-col gap-4 overflow-hidden">
              {/* Projects Section */}
              <div className="flex flex-col flex-shrink-0">
                <div className="flex items-center justify-between mb-1 gap-2 p-1 bg-theme-background-alt rounded">
                  <h3 className="text-sm font-medium">Projects</h3>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="foreground1"
                      box="round"
                      size="small"
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        setShowProjectPicker(true);
                      }}
                      title="Search projects"
                    >
                      Search
                    </Button>
                    <Button
                      variant="foreground0"
                      box="round"
                      size="small"
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        setNewProjectDirectory("");
                        setShowNewProjectForm(true);
                      }}
                    >
                      New Project
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <ProjectSelector
                    projects={sortedProjects}
                    currentProject={currentProject}
                    onSelect={(project) => {
                      handleProjectSwitch(project);
                      setIsMobileSidebarOpen(false);
                    }}
                    buttonClassName="!py-2 !px-3"
                  />
                  {currentProject ? null : (
                    <div className="text-xs text-theme-muted">
                      {sortedProjects.length > 0
                        ? "Choose a project from the menu above."
                        : "No projects yet. Use New Project to add an existing git repository."}
                    </div>
                  )}
                </div>
              </div>

              {/* Sessions Section */}
              <div className="flex flex-col flex-1 min-h-0 mt-2">
                <div className="flex justify-between items-center mb-1 gap-2 p-1 bg-theme-background-alt rounded">
                  <h3 className="text-sm font-medium">Sessions</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="foreground1"
                      box="round"
                      onClick={handleMobileEditToggle}
                      size="small"
                      disabled={!currentProject}
                    >
                      {mobileEditMode ? "Done" : "Edit"}
                    </Button>
                    <Button
                      variant="foreground0"
                      box="round"
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        setNewSessionTitle("");
                        setShowNewSessionForm(true);
                      }}
                      size="small"
                      disabled={!currentProject}
                    >
                      New Session
                    </Button>
                  </div>
                </div>
                
                {/* Mobile Search Input */}
                {currentProject && (
                  <div className="mt-2 mb-2">
                    <SessionSearchInput
                      value={sessionSearchQuery}
                      onChange={setSessionSearchQuery}
                      onClear={() => setSessionSearchQuery("")}
                    />
                  </div>
                )}
                
                {!currentProject ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-theme-muted text-center px-4">
                    Select a project, or use New Project to add a git directory
                  </div>
                ) : (
                  <>
                    {/* Bulk delete controls */}
                    {mobileEditMode && (
                      <>
                        <div className="flex items-center justify-between gap-2 px-2 py-2 bg-theme-background-alt rounded mb-2">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="foreground1"
                              box="round"
                              size="small"
                              onClick={handleMobileSelectAll}
                            >
                              Select All
                            </Button>
                            <Button
                              variant="foreground2"
                              box="round"
                              size="small"
                              onClick={handleMobileClearSelection}
                              disabled={selectedMobileSessionIds.size === 0}
                            >
                              Clear
                            </Button>
                          </div>
                          <Button
                            variant="error"
                            box="round"
                            size="small"
                            onClick={handleMobileBulkDelete}
                            disabled={selectedMobileSessionIds.size === 0}
                             >
                               <span className={selectedSidebarSessionIds.size > 1 ? 'text-red-500' : ''}>
                                 Delete{selectedSidebarSessionIds.size > 0 ? ` (${selectedSidebarSessionIds.size})` : ""}
                               </span>
                             </Button>
                        </div>
                        <Separator className="mb-2" />
                      </>
                    )}

                    {(() => {
                      const projectSessions = filteredSessions.filter(
                        (session) =>
                          session.projectID === currentProject?.id ||
                          session.directory === currentProject?.worktree,
                      );
                      
                      if (projectSessions.length === 0 && sessionSearchQuery) {
                        return (
                          <div className="flex-1 flex flex-col items-center justify-center text-sm text-theme-muted text-center px-4 gap-2">
                            <div>No sessions found matching "{sessionSearchQuery}"</div>
                            <Button
                              variant="foreground1"
                              box="round"
                              size="small"
                              onClick={() => setSessionSearchQuery("")}
                            >
                              Clear search
                            </Button>
                          </div>
                        );
                      }
                      
                      if (projectSessions.length === 0) {
                        return (
                          <div className="flex-1 flex items-center justify-center text-sm text-theme-muted text-center px-4">
                            No sessions yet. Create one above.
                          </div>
                        );
                      }
                      
                      return (
                        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                          {projectSessions.map((session) => {
                            const isSelected = currentSession?.id === session.id;
                            const isChecked = selectedMobileSessionIds.has(session.id);
                            return (
                              <div
                                key={session.id}
                                className={`pl-2 pr-0 py-2 cursor-pointer transition-colors rounded ${
                                  mobileEditMode ? "flex items-start gap-2" : ""
                                }`}
                                style={{
                                  backgroundColor: mobileEditMode
                                    ? isChecked
                                      ? "rgba(from var(--theme-primary) r g b / 0.15)"
                                      : "var(--theme-background)"
                                    : isSelected
                                      ? "var(--theme-primary)"
                                      : "var(--theme-background)",
                                  color: mobileEditMode
                                    ? "var(--theme-foreground)"
                                    : isSelected
                                      ? "var(--theme-background)"
                                      : "var(--theme-foreground)",
                                  border: mobileEditMode
                                    ? `1px solid ${isChecked ? "var(--theme-primary)" : "var(--theme-borderSubtle)"}`
                                    : "1px solid transparent",
                                }}
                                onClick={() => {
                                  if (mobileEditMode) {
                                    handleMobileSessionToggle(session.id);
                                  } else {
                                    handleSessionSwitch(session.id);
                                    setIsMobileSidebarOpen(false);
                                  }
                                }}
                                onMouseEnter={(e) => {
                                  if (mobileEditMode) {
                                    if (!isChecked) {
                                      e.currentTarget.style.backgroundColor =
                                        "var(--theme-backgroundAlt)";
                                    }
                                    return;
                                  }

                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor =
                                      "var(--theme-backgroundAlt)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (mobileEditMode) {
                                    e.currentTarget.style.backgroundColor = isChecked
                                      ? "rgba(from var(--theme-primary) r g b / 0.15)"
                                      : "var(--theme-background)";
                                    return;
                                  }

                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor =
                                      "var(--theme-background)";
                                  }
                                }}
                              >
                                {mobileEditMode && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-1 flex-shrink-0"
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      onChange={() =>
                                        handleMobileSessionToggle(session.id)
                                      }
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {session.title}
                                  </div>
                                  <div className="text-xs opacity-70 truncate">
                                    {session.createdAt?.toLocaleDateString() ||
                                      "Unknown"}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "files" && (
            <div className="h-full flex flex-col gap-2 overflow-hidden">
              <h3 className="text-sm font-medium">Files</h3>
              <Separator />
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {sortedFiles.length > 0 ? (
                  sortedFiles.map((file) => {
                    const isDirectory = file.type === "directory";
                    const isSelected =
                      !isDirectory && selectedFile === file.path;
                    return (
                      <div
                        key={file.path}
                        className="px-2 py-1 cursor-pointer transition-colors rounded"
                        style={{
                          backgroundColor: isSelected
                            ? "var(--theme-primary)"
                            : "var(--theme-background)",
                          color: isSelected
                            ? "var(--theme-background)"
                            : "var(--theme-foreground)",
                        }}
                        onClick={() => {
                          if (isDirectory) {
                            void handleDirectoryOpen(file.path);
                          } else {
                            void handleFileSelect(file.path);
                            setIsMobileSidebarOpen(false);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor =
                              "var(--theme-backgroundAlt)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor =
                              "var(--theme-background)";
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <FileIcon
                            node={{
                              path: file.path,
                              type: isDirectory ? "directory" : "file",
                            }}
                          />
                          <span className="truncate">{file.name}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-sm py-4 text-theme-muted">
                    No files loaded
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "status" && (
            <div className="flex-1 overflow-y-auto space-y-3">
              <SessionContextPanel />
              <Separator />
              <McpStatusPanel />
              <Separator />
              <ModifiedFilesPanel onFileClick={handleFileSelect} />
              <Separator />
              <LspStatusPanel />
            </div>
          )}
        </MobileSidebar>

        <Separator direction="vertical" />

        {/* Main Editor Area */}
        <View
          box="square"
          className="flex-1 min-w-0 flex flex-col gap-0 bg-theme-background"
          style={{
            filter: shouldBlurEditor ? "blur(4px)" : undefined,
            pointerEvents: shouldBlurEditor ? "none" : undefined,
          }}
        >
          {/* Header */}
          <div className="px-2 sm:px-3 py-1 flex items-center bg-theme-background-alt min-w-0 gap-2">
            <button
              onClick={() => {
                closeAllModals();
                setShowProjectPicker(true);
              }}
              className="button-reset min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                margin: 0,
                textAlign: "left",
              }}
              title={`Project: ${currentProject?.worktree || "No project"}`}
              aria-label={`Current project: ${currentProject?.worktree || "No project"}. Click to change project.`}
            >
              <div className="text-sm font-normal text-theme-foreground-alt truncate">
                {currentProject?.worktree || "No project"}
              </div>
              {currentSessionTodos.length > 0 && (
                <Badge variant="foreground0" cap="square" className="text-xs flex-shrink-0">
                  {currentSessionTodos.length} todo
                  {currentSessionTodos.length === 1 ? "" : "s"} pending
                </Badge>
              )}
            </button>
          </div>

          <Separator />

          {/* Content */}
          {activeTab === "workspace" && (
            <div
              className="flex-1 flex flex-col overflow-hidden"
              data-dialog-anchor="chat"
            >
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto scrollbar p-2 pb-4 space-y-2 min-h-0 flex flex-col">
                <div className="max-w-none lg:mx-auto lg:max-w-6xl xl:max-w-7xl space-y-2 flex-1 flex flex-col">
                  {messages.length === 0 && !loading && (
                    <div className="flex items-center justify-center flex-1">
                      <View
                        box="round"
                        className="max-w-4xl w-full p-6 text-center bg-theme-background-alt"
                      >
                        {currentProject && !currentSession ? (
                          <img
                            src="/assets/ocweb-logo.png"
                            alt="OC Web logo"
                            className="mx-auto mb-4 h-24 w-auto"
                          />
                        ) : (
                          <>
                             <img
                              src="/assets/ocweb-logo.png"
                              alt="OC Web logo"
                              className="mx-auto mb-6 h-16 w-auto"
                            />
                            {!currentProject ? (
                              <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-theme-foreground mb-4">
                                  Welcome to OC Web
                                </h2>
                                <div className="text-theme-foreground opacity-90 space-y-3 max-w-2xl mx-auto">
                                  <p className="text-base">
                                    Navigate quickly using the{" "}
                                    <kbd className="px-2 py-1 bg-theme-background rounded border border-theme-primary text-theme-primary font-mono text-sm">
                                      Space
                                    </kbd>{" "}
                                    leader key
                                  </p>
                                  <p className="text-sm opacity-80">
                                    Press{" "}
                                    <kbd className="px-2 py-1 bg-theme-background rounded border border-theme-primary text-theme-primary font-mono text-xs">
                                      Space
                                    </kbd>{" "}
                                    now to see all available shortcuts
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <Pre
                                size="small"
                                className="break-words whitespace-pre-wrap overflow-wrap-anywhere text-theme-foreground opacity-80"
                              >
                                Send a message to start a new session. Use @ to reference files, / for commands, and Tab to switch agents.
                              </Pre>
                            )}
                          </>
                        )}
                         {currentProject && (
                          <div className="flex gap-2 justify-center flex-wrap mt-4">
                            {!currentSession && (
                              <Badge
                                variant="foreground0"
                                cap="square"
                                className="text-xs"
                              >
                                Create or select a session →
                              </Badge>
                            )}
                          </div>
                        )}
                      </View>
                    </div>
                  )}
                  {messages.map((message) => {
                    const hasRenderableParts = Array.isArray(message.parts)
                      ? message.parts.some((part) => {
                          if (
                            !part ||
                            typeof part !== "object" ||
                            !("type" in part) ||
                            typeof part.type !== "string"
                          ) {
                            return false;
                          }
                          if (!RENDERABLE_PART_TYPES.has(part.type)) {
                            return false;
                          }
                          if (part.type === "text") {
                            const rawText =
                              typeof (part as { text?: unknown }).text === "string"
                                ? ((part as { text?: string }).text ?? "").trim()
                                : "";
                            if (!rawText || GENERIC_TOOL_TEXTS.has(rawText)) {
                              return false;
                            }
                          }
                          return true;
                        })
                      : false;
                    const normalizedContent =
                      typeof message.content === "string"
                        ? message.content.trim()
                        : "";
                    const hasTextContent =
                      normalizedContent.length > 0 &&
                      !GENERIC_TOOL_TEXTS.has(normalizedContent);
                    const shouldHideUserBubble =
                      message.type === "user" &&
                      (message.shellCommand !== undefined ||
                        (!hasRenderableParts && !hasTextContent));

                    if (shouldHideUserBubble) {
                      return null;
                    }

                    return (
                      <div
                        key={message.clientId ?? message.id}
                        className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <View
                          box="round"
                          className={`max-w-full sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl p-2 ${
                            message.type === "user"
                              ? message.error
                                ? "bg-theme-error/10 border-theme-error text-theme-error"
                                : "bg-theme-primary/20 border-theme-primary text-theme-foreground"
                              : "bg-theme-background-alt text-theme-foreground"
                          }`}
                        >
                          {message.parts && message.parts.length > 0 ? (
                            <div className="space-y-2">
                              {message.parts.map((part, idx) => (
                                <MessagePart
                                  key={`${message.id}-part-${idx}`}
                                  part={part}
                                  messageRole={message.type}
                                  showDetails={true}
                                />
                              ))}
                              {message.metadata && (
                                <div className="text-xs opacity-60 mt-1.5 flex gap-3 flex-wrap">
                                  {message.metadata.agent && (
                                    <span>Agent: {message.metadata.agent}</span>
                                  )}
                                  {message.metadata.tokens && (
                                    <span>
                                      Tokens:{" "}
                                      {message.metadata.tokens.input +
                                        message.metadata.tokens.output}
                                      {message.metadata.tokens.reasoning > 0 &&
                                        ` (+${message.metadata.tokens.reasoning} reasoning)`}
                                    </span>
                                  )}
                                  {message.metadata.cost && (
                                    <span>
                                      Cost: ${message.metadata.cost.toFixed(4)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <Pre
                                size="small"
                                className="break-words whitespace-pre-wrap overflow-wrap-anywhere"
                              >
                                {message.content}
                              </Pre>
                              {message.queued && (
                                <div className="flex items-center gap-2 text-xs text-theme-warning">
                                  <div className="w-2 h-2 rounded-full bg-theme-warning animate-pulse" />
                                  <span>
                                    Queued (Position: {message.queuePosition})
                                  </span>
                                  <button
                                    onClick={() => removeFromQueue(message.id)}
                                    className="ml-2 px-2 py-0.5 rounded bg-theme-background hover:bg-theme-background-alt border border-theme-border text-theme-foreground"
                                    title="Cancel queued message"
                                  >
                                    ✕ Cancel
                                  </button>
                                </div>
                              )}
                              {message.optimistic && !message.queued && (
                                <div className="text-xs opacity-60">Sending…</div>
                              )}
                              {message.error && (
                                <div className="text-xs text-theme-error">
                                  {message.errorMessage ||
                                    "Send failed. Please retry."}
                                </div>
                              )}
                            </div>
                          )}
                        </View>
                      </div>
                    );
                  })}
                  {loading && !isStreaming && (
                    <div className="flex justify-start">
                      <View
                        box="round"
                        className="max-w-xs p-3 bg-theme-background-alt"
                      >
                        <Pre size="small" className="text-theme-foreground">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 rounded-full animate-bounce bg-theme-primary" />
                            <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.1s] bg-theme-primary" />
                            <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.2s] bg-theme-primary" />
                          </div>
                        </Pre>
                        <Badge
                          variant="foreground0"
                          cap="square"
                          className="mt-2 text-xs"
                        >
                          OpenCode
                        </Badge>
                      </View>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <Separator />

              {/* Input Area */}
              <View
                box="square"
                className="px-2 sm:px-3 py-2 space-y-2 bg-theme-background-alt"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-4 text-xs text-theme-foreground min-w-0 flex-1">
                    {/* Model */}
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="hidden md:inline font-medium text-theme-foreground">Model:</span>
                      <button
                        onClick={() => {
                          closeAllModals();
                          setShowModelPicker(true);
                        }}
                        className="button-reset text-xs text-theme-primary hover:underline cursor-pointer min-w-0"
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          margin: 0,
                          textAlign: "left",
                        }}
                        title={selectedModel?.name || "Loading..."}
                        aria-label={`Current model: ${selectedModel?.name || "Loading..."}`}
                      >
                        <div className="truncate">{selectedModel?.name || "Loading..."}</div>
                      </button>
                    </div>

                    {/* Session */}
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="hidden md:inline font-medium text-theme-foreground">Session:</span>
                      <button
                        onClick={() => {
                          closeAllModals();
                          setShowSessionPicker(true);
                        }}
                        className="button-reset text-xs text-theme-primary hover:underline cursor-pointer min-w-0"
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          margin: 0,
                          textAlign: "left",
                        }}
                        title={currentSessionLabel || "No session"}
                        aria-label={`Current session: ${currentSessionLabel || "No session"}`}
                      >
                        <div className="truncate">{currentSessionLabel || "No session"}</div>
                      </button>
                    </div>
                    {currentSessionBusy && (
                      <>
                        <span className="text-theme-muted">•</span>
                        <Badge
                          variant="foreground0"
                          cap="square"
                          className="flex items-center gap-1 animate-pulse"
                        >
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                          Agent running {!isMobile && "(ESC to stop)"}
                        </Badge>
                      </>
                    )}
                    {sessionTokenStats.totalTokens > 0 && isMobile && (
                      <>
                        <span className="text-theme-muted">•</span>
                        <span className="font-medium">Tokens:</span>
                        <span className="text-theme-foreground">
                          {sessionTokenStats.totalTokens.toLocaleString()}
                        </span>
                        <span className="text-theme-muted">
                          ({sessionTokenStats.contextPercentage}%)
                        </span>
                      </>
                    )}
                    {isSlashCommandInput && (
                      <>
                        <span className="text-theme-muted">•</span>
                        <span className="text-theme-error font-medium">
                          Command Mode
                        </span>
                      </>
                    )}
                    {isShellInput && (
                      <>
                        <span className="text-theme-muted">•</span>
                        <span className="text-theme-warning font-medium">
                          Shell Mode
                        </span>
                      </>
                    )}
                  </div>
                  {!isMobile && sessionTokenStats.totalTokens > 0 && (
                    <div className="flex items-center gap-2 text-xs text-theme-foreground flex-shrink-0">
                      <span className="font-medium">Tokens:</span>
                      <span className="text-theme-foreground">
                        {sessionTokenStats.totalTokens.toLocaleString()}
                      </span>
                      <span className="text-theme-muted">
                        ({sessionTokenStats.contextPercentage}%)
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => setShowAgentPicker(true)}
                    className="appearance-none cursor-pointer hover:opacity-80 transition-opacity h-auto"
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      margin: 0,
                      height: "auto",
                      display: "inline-block",
                    }}
                  >
                    <Badge
                      key={currentAgent?.id || currentAgent?.name}
                      variant="foreground0"
                      cap="square"
                      className="flex-shrink-0"
                    >
                      Agent: {currentAgent?.name || "None"}
                    </Badge>
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-stretch gap-2">
                  <div className="flex-1 relative w-full">
                    {messageQueue.length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-theme-background-alt rounded-md border border-theme-warning">
                        <Badge variant="foreground1" cap="square">
                          {messageQueue.length} message
                          {messageQueue.length > 1 ? "s" : ""} queued
                        </Badge>
                        <button
                          onClick={clearQueue}
                          className="px-2 py-1 text-xs rounded bg-theme-background hover:bg-theme-background-alt border border-theme-border text-theme-foreground"
                          title="Clear queue"
                        >
                          Clear Queue
                        </button>
                      </div>
                    )}
                    {isShellInput && (
                      <div className="mb-2 flex flex-wrap items-center gap-2 rounded border border-theme-warning/70 bg-theme-warning/10 px-3 py-2 text-xs text-theme-foreground">
                        <Badge variant="foreground0" cap="square">
                          Shell Mode
                        </Badge>
                        <span>
                          Running in{" "}
                          <code className="font-mono break-all">
                            {shellDirectoryLabel}
                          </code>
                        </span>
                      </div>
                    )}
                    {showCommandPicker && (
                      <CommandPicker
                        commands={commandSuggestions}
                        onSelect={handleCommandSelect}
                        onClose={() => setShowCommandPicker(false)}
                        selectedIndex={selectedCommandIndex}
                      />
                    )}
                    {isHandlingImageUpload && (
                      <div
                        className="mb-2 rounded border border-theme-border bg-theme-background-alt px-3 py-2 text-xs text-theme-muted"
                        role="status"
                      >
                        Processing images...
                      </div>
                    )}
                    {imageAttachments.length > 0 && (
                      <div
                        className="mb-2 rounded border border-theme-border bg-theme-background-alt/70 p-3"
                        aria-live="polite"
                      >
                        <div className="mb-2 flex items-center justify-between text-xs text-theme-muted">
                          <span>
                            {imageAttachments.length} image
                            {imageAttachments.length > 1 ? "s" : ""} attached
                          </span>
                          <button
                            type="button"
                            onClick={() => setImageAttachments([])}
                            className="rounded px-2 py-1 text-[11px] uppercase tracking-wide text-theme-muted transition-colors hover:text-theme-foreground disabled:opacity-60"
                            disabled={isHandlingImageUpload}
                          >
                            Clear all
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {imageAttachments.map((attachment) => (
                            <ImagePreview
                              key={attachment.id}
                              attachment={attachment}
                              onRemove={removeImageAttachment}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      onDrop={handleDrop}
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      placeholder={
                        currentSessionBusy && !isMobile
                          ? "Agent running... Press ESC to stop, or type to queue a message"
                          : "Type your message, Tab to switch agent, / for commands, ! for shell commands, @ to mention files, Shift+Enter for new line, Enter to send"
                      }
                      rows={2}
                      size="large"
                      className={`w-full bg-theme-background text-theme-foreground resize-none ${
                        isShellInput ? "border-theme-warning" : "border-theme-primary"
                      } ${
                        isDraggingOverInput
                          ? "border-2 border-dashed border-theme-primary/80"
                          : ""
                      }`}
                    />
                    {showMentionSuggestions &&
                      mentionSuggestions.length > 0 && (
                        <div
                          className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto scrollbar z-10 shadow-lg rounded border"
                          style={{
                            backgroundColor: "var(--theme-backgroundAlt)",
                            borderColor: "var(--theme-primary)",
                            borderWidth: "1px",
                          }}
                        >
                          {mentionSuggestions.map((suggestion, index) => {
                            const isSelected = index === selectedMentionIndex;
                            return (
                              <div
                                key={suggestion.label}
                                className={`p-2 cursor-pointer transition-colors text-sm ${suggestion.type === "agent" ? "agent-suggestion" : ""}`}
                                style={{
                                  backgroundColor: isSelected
                                    ? "var(--theme-primary)"
                                    : "transparent",
                                  color: isSelected
                                    ? "var(--theme-background)"
                                    : "var(--theme-foreground)",
                                }}
                                onClick={() => handleMentionSelect(suggestion)}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor =
                                      "var(--theme-backgroundAlt)";
                                    e.currentTarget.style.opacity = "0.8";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor =
                                      "transparent";
                                    e.currentTarget.style.opacity = "1";
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 truncate">
                                    <span className="suggestion-name">
                                      {suggestion.label}
                                    </span>
                                    {suggestion.type === "agent" &&
                                      suggestion.description && (
                                        <span
                                          className="suggestion-desc block text-xs"
                                          style={{ opacity: 0.6 }}
                                        >
                                          {suggestion.description}
                                        </span>
                                      )}
                                  </div>
                                  {isSelected && (
                                    <Badge
                                      variant="background2"
                                      cap="square"
                                      className="text-xs"
                                    >
                                      ↵
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </div>
                  {currentSessionBusy && isMobile && (
                    <div className="relative w-full">
                      <Button
                        variant="foreground0"
                    box="round"
                        size="large"
                        onClick={handleAbort}
                        disabled={abortInFlight}
                        className="w-full text-white disabled:opacity-50"
                        style={{
                          backgroundColor: "var(--theme-error)",
                          opacity: abortInFlight ? 0.7 : 1,
                        }}
                      >
                        {abortInFlight
                          ? "Stopping..."
                          : "Stop Agent (ESC on desktop)"}
                      </Button>
                    </div>
                  )}
                </div>
              </View>
            </div>
          )}

          {activeTab === "files" && (
            <div className="flex-1 min-w-0 p-4 flex flex-col overflow-hidden bg-theme-background">
              {selectedFile ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      {selectedFileName}
                      {showLanguageBadge && selectedFile && (
                        <Badge
                          variant="foreground0"
                          cap="square"
                          className="text-xs"
                        >
                          {detectLanguage(selectedFile)}
                        </Badge>
                      )}
                      {showMimeTypeBadge && fileContent?.mimeType && (
                        <Badge
                          variant="foreground0"
                          cap="square"
                          className="text-xs uppercase"
                        >
                          {fileContent.mimeType}
                        </Badge>
                      )}
                    </h3>
                    <div className="flex gap-2">
                      {fileContent?.diff && (
                        <Button
                          variant={fileViewMode === "diff" ? "foreground1" : "foreground0"}
                          box="round"
                          onClick={() =>
                            setFileViewMode(fileViewMode === "diff" ? "code" : "diff")
                          }
                          size="small"
                          aria-pressed={fileViewMode === "diff"}
                        >
                          {fileViewMode === "diff" ? "Show Code" : "Show Diff"}
                        </Button>
                      )}
                      {canPreviewMarkdown && (
                        <Button
                          variant={fileViewMode === "preview" ? "foreground1" : "foreground0"}
                          box="round"
                          onClick={() =>
                            setFileViewMode(
                              fileViewMode === "preview" ? "code" : "preview",
                            )
                          }
                          size="small"
                          aria-pressed={fileViewMode === "preview"}
                        >
                          {fileViewMode === "preview" ? "Show Code" : "Preview"}
                        </Button>
                      )}
                      {hasBinaryDownload && fileContent?.dataUrl && (
                        <Button
                          variant="foreground0"
                          box="round"
                          onClick={triggerBinaryDownload}
                          size="small"
                        >
                          Download
                        </Button>
                      )}
                      {showLanguageBadge && (
                        <Button
                          variant="foreground0"
                          box="round"
                          onClick={() => {
                            if (fileContent?.text) {
                              navigator.clipboard.writeText(fileContent.text);
                            }
                          }}
                          size="small"
                          disabled={copyButtonDisabled}
                          className={
                            copyButtonDisabled
                              ? "opacity-50 cursor-not-allowed"
                              : undefined
                          }
                        >
                          Copy
                        </Button>
                      )}
                       <Button
                         variant="background2"
                         box="round"
                         onClick={() => {
                           setSelectedFile(null);
                           setFileContent(null);
                           setFileError(null);
                         }}
                         size="small"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {fileError ? (
                      <div className="text-center text-sm text-red-400 p-4">
                        {fileError}
                      </div>
                    ) : fileViewMode === "diff" && fileContent?.diff ? (
                      <div className="h-full overflow-auto scrollbar">
                        <PrettyDiff diffText={fileContent.diff} />
                      </div>
                    ) : fileViewMode === "preview" && canPreviewMarkdown ? (
                      <div className="h-full overflow-auto scrollbar bg-theme-background p-6">
                        <MarkdownRenderer
                          content={fileContent?.text ?? ""}
                          enableImages={featureFlags.enableMarkdownImages}
                        />
                      </div>
                    ) : selectedFileIsImage ? (
                      <div className="flex items-center justify-center h-full max-w-full bg-theme-backgroundAccent rounded p-4 overflow-auto scrollbar">
                        {fileContent?.dataUrl ? (
                          <img
                            src={fileContent.dataUrl}
                            alt={
                              selectedFileName ??
                              selectedFile ??
                              "Selected file"
                            }
                            className="max-w-full max-h-full object-contain"
                            onError={() => {
                              console.error(
                                "Image load error for:",
                                selectedFile,
                              );
                              setFileError(
                                "Failed to load image. The file may be binary data that cannot be displayed.",
                              );
                            }}
                          />
                        ) : (
                          <div className="text-center text-sm text-theme-muted">
                            No image data available
                          </div>
                        )}
                      </div>
                    ) : selectedFileIsPdf ? (
                      <div className="h-full max-w-full bg-theme-backgroundAccent rounded overflow-auto scrollbar">
                        {fileContent?.dataUrl ? (
                          <iframe
                            src={fileContent.dataUrl}
                            title={
                              selectedFileName ?? selectedFile ?? "PDF preview"
                            }
                            className="w-full h-full"
                          />
                        ) : (
                          <div className="text-center text-sm text-theme-muted p-4">
                            PDF preview unavailable
                          </div>
                        )}
                      </div>
                    ) : hasTextContent && selectedFile ? (
                      <pre className="hljs bg-theme-background p-4 rounded overflow-auto scrollbar h-full text-sm font-mono m-0">
                        <code
                          dangerouslySetInnerHTML={{
                            __html: addLineNumbers(
                              highlightCode(
                                fileTextContent ?? "",
                                detectLanguage(selectedFile),
                              ),
                            ),
                          }}
                        />
                      </pre>
                    ) : hasBinaryDownload && fileContent?.dataUrl ? (
                      <div className="flex flex-col items-center justify-center h-full text-sm text-theme-muted gap-3">
                        <p>Preview not available for this file type.</p>
                        <Button
                          variant="foreground0"
                          box="round"
                          onClick={triggerBinaryDownload}
                          size="small"
                        >
                          Download file
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center text-sm text-theme-muted p-4">
                        No preview available
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-theme-muted">
                  Select a file to view its contents
                </div>
              )}
            </div>
          )}
        </View>
        {isStatusSidebarOpen && (
          <View
            box="square"
            className="hidden md:flex flex-col p-4 bg-theme-background-alt relative"
            style={{ width: `${rightSidebarWidth}px` }}
          >
            <div
              className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-theme-primary transition-colors z-10"
              onMouseDown={handleRightResizeStart}
              style={{
                backgroundColor: isRightResizing
                  ? "var(--theme-primary)"
                  : "transparent",
              }}
            />
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Info</h3>
              <Button
                variant="foreground1"
                box="round"
                size="small"
                onClick={() => void refreshStatusAll()}
              >
                Refresh
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              <SessionContextPanel />
              <McpStatusPanel />
              <ModifiedFilesPanel onFileClick={handleFileSelect} />
              <LspStatusPanel />
            </div>
          </View>
        )}
      </div>

      {showNewProjectForm && (
        <Dialog open onClose={closeNewProjectDialog}>
          <View
            box="square"
            className="w-full max-w-lg rounded border bg-theme-background text-theme-foreground"
            style={{ borderColor: "var(--theme-primary)", borderWidth: "1px" }}
          >
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Add Project</h2>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Project directories must already be git repositories. We'll
                  create the first session automatically.
                </p>
              </div>
              <Input
                value={newProjectDirectory}
                onChange={(e) => setNewProjectDirectory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newProjectDirectory.trim()) {
                    e.preventDefault();
                    void handleCreateProject();
                  }
                }}
                placeholder="Project directory (git repo)..."
                size="small"
                className="bg-theme-background text-theme-foreground border-theme-primary"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="background2"
                  box="round"
                  size="small"
                  onClick={closeNewProjectDialog}
                >
                  Cancel
                </Button>
                <Button
                  variant="foreground0"
                  box="round"
                  size="small"
                  onClick={() => void handleCreateProject()}
                  disabled={!newProjectDirectory.trim() || loading}
                >
                  Create Project
                </Button>
              </div>
            </div>
          </View>
        </Dialog>
      )}

      {/* New Session Dialog */}
      {showNewSessionForm && (
        <Dialog open onClose={closeNewSessionDialog}>
          <View
            box="square"
            className="w-full max-w-lg rounded border bg-theme-background text-theme-foreground"
            style={{ borderColor: "var(--theme-primary)", borderWidth: "1px" }}
          >
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">New Session</h2>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Create a new session for the current project:{" "}
                  {currentProject?.worktree}
                </p>
              </div>
              <Input
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleCreateSession();
                  }
                }}
                placeholder="Session title (optional)..."
                size="small"
                className="bg-theme-background text-theme-foreground border-theme-primary"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="background2"
                  box="round"
                  size="small"
                  onClick={closeNewSessionDialog}
                >
                  Cancel
                </Button>
                <Button
                  variant="foreground0"
                  box="round"
                  size="small"
                  onClick={() => void handleCreateSession()}
                  disabled={loading}
                >
                  Create Session
                </Button>
              </div>
            </div>
          </View>
        </Dialog>
      )}

      {/* Help Dialog */}
      {showHelp && (
        <Dialog open={showHelp} onClose={() => {
          setShowHelp(false);
          setHelpSearchQuery("");
        }}>
          <View
            box="square"
            className="p-6 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col bg-theme-background text-theme-foreground"
          >
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-lg font-bold">OpenCode Commands</h2>
               <Button
                 variant="background2"
                 box="round"
                 onClick={() => {
                   setShowHelp(false);
                   setHelpSearchQuery("");
                 }}
                 size="small"
              >
                Close
              </Button>
            </div>
            <Separator className="mb-4 flex-shrink-0" />
            
            {/* Search Input */}
            <div className="mb-4 flex-shrink-0">
              <Input
                ref={helpSearchInputRef}
                placeholder="Search commands..."
                size="small"
                value={helpSearchQuery}
                onChange={(e) => setHelpSearchQuery(e.target.value)}
                className="w-full bg-theme-background-alt text-theme-foreground border-theme-primary"
              />
            </div>
            <Separator className="mb-4 flex-shrink-0" />

            <div className="space-y-6 overflow-y-auto scrollbar flex-1 pb-4">
              {filteredHelpCommands.length === 0 ? (
                <div className="text-center text-sm py-4 opacity-70">
                  No commands found matching "{helpSearchQuery}"
                </div>
              ) : (
                Object.entries(groupedHelpCommands).map(([category, commands]) => (
                  <div key={category}>
                    <div className="text-xs font-bold uppercase mb-2 opacity-60">
                      {category}
                    </div>
                    <div className="space-y-1 font-mono text-sm">
                      {commands.map((cmd, idx) => (
                        <div key={idx} className="flex justify-between p-2 rounded bg-theme-background-alt">
                          <span className="text-theme-primary">{cmd.command}</span>
                          <span className="opacity-70">{cmd.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}

              <Separator />

              <div className="text-xs opacity-70 space-y-1">
                <div>
                  <span className="font-bold">Tip:</span> Start typing / to see
                  autocomplete suggestions
                </div>
                <div>
                  <span className="font-bold">Tip:</span> Press Tab to complete
                  commands
                </div>
                <div>
                  <span className="font-bold">Tip:</span> Use @ to reference
                  files in your messages
                </div>
              </div>
            </div>
          </View>
        </Dialog>
      )}

      {/* Themes Dialog */}
      {showThemes && (
        <ThemePickerDialog
          currentTheme={currentTheme}
          onThemeChange={changeTheme}
          onClose={() => setShowThemes(false)}
        />
      )}

      {/* Config Dialog */}
      {showConfig && (
        <Dialog open={showConfig} onClose={() => setShowConfig(false)}>
          <View
            box="square"
            className="p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col bg-theme-background text-theme-foreground"
          >
            <h2 className="text-lg font-bold mb-4">OpenCode Configuration</h2>
            <Separator className="mb-4" />
            
            {/* Search Input */}
            <div className="mb-4">
              <Input
                ref={configSearchInputRef}
                placeholder="Search config (jq-like filter)..."
                size="small"
                value={configSearchQuery}
                onChange={(e) => setConfigSearchQuery(e.target.value)}
                className="w-full bg-theme-background-alt text-theme-foreground border-theme-primary"
              />
              {configSearchQuery && (
                <div className="text-xs opacity-70 mt-2">
                  Filtering configuration...
                </div>
              )}
            </div>
            <Separator className="mb-4" />
            
            <div className="flex-1 overflow-y-auto scrollbar mb-4">
              <Pre className="text-xs bg-theme-background-alt p-4 rounded">
                {filteredConfigData || "Loading..."}
              </Pre>
            </div>
            <Separator className="mb-4" />
            <div className="flex justify-between">
              {configSearchQuery && (
                <Button
                  variant="foreground1"
                  box="round"
                  onClick={() => setConfigSearchQuery("")}
                  size="small"
                >
                  Clear Filter
                </Button>
              )}
              <div className="flex-1" />
              <Button
                variant="background2"
                box="round"
                onClick={() => {
                  setShowConfig(false);
                  setConfigSearchQuery("");
                }}
                size="small"
              >
                Close
              </Button>
            </div>
          </View>
        </Dialog>
      )}

      {/* Onboarding Dialog */}
      {showOnboarding && (
        <Dialog open={showOnboarding} onClose={() => setShowOnboarding(false)}>
          <View
            box="square"
            className="p-6 max-w-md w-full bg-theme-background text-theme-foreground"
          >
            <h2 className="text-lg font-bold mb-4">
              Connect to OpenCode Server
            </h2>
            <Separator className="mb-4" />
            <p className="text-sm mb-4">Enter your OpenCode server URL:</p>
            <Input
              placeholder="http://192.168.1.100:4096"
              size="large"
              className="mb-4"
              onChange={() => {
                // TODO: Update env var
              }}
            />
            <p className="text-xs opacity-70 mb-4">
              Find your IP: macOS/Linux: ifconfig | grep inet, Windows: ipconfig
            </p>
            <Separator className="mb-4" />
            <Button
              variant="foreground0"
              box="round"
              onClick={() => setShowOnboarding(false)}
              size="small"
            >
              Connect
            </Button>
          </View>
        </Dialog>
      )}

      {/* Model Picker Dialog */}
      {showModelPicker && (
        <Dialog
          open={showModelPicker}
          onClose={() => {
            setShowModelPicker(false);
            setModelSearchQuery("");
            setSelectedModelIndex(0);
          }}
        >
          <View
            box="square"
            className="p-6 max-w-md w-full max-h-[80vh] overflow-hidden bg-theme-background text-theme-foreground"
          >
            <h2 className="text-lg font-bold mb-4">Select Model</h2>
            <Separator className="mb-4" />
            <div className="mb-4">
              <Input
                ref={modelSearchInputRef}
                placeholder="Search models..."
                size="small"
                value={modelSearchQuery}
                onChange={(e) => setModelSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  const totalItems =
                    !modelSearchQuery.trim() && recentModels.length > 0
                      ? recentModels.length + filteredModels.length
                      : filteredModels.length;

                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedModelIndex((prev) =>
                      prev < totalItems - 1 ? prev + 1 : prev,
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedModelIndex((prev) =>
                      prev > 0 ? prev - 1 : prev,
                    );
                  } else if (e.key === "Enter" && totalItems > 0) {
                    e.preventDefault();
                    const allModels =
                      !modelSearchQuery.trim() && recentModels.length > 0
                        ? [...recentModels, ...filteredModels]
                        : filteredModels;
                    selectModel(allModels[selectedModelIndex]);
                    setShowModelPicker(false);
                    setModelSearchQuery("");
                    setSelectedModelIndex(0);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setShowModelPicker(false);
                    setModelSearchQuery("");
                    setSelectedModelIndex(0);
                  }
                }}
              />
            </div>
            <div className="max-h-64 overflow-y-auto scrollbar space-y-2">
              {filteredModels.length === 0 ? (
                <div className="text-center text-sm py-4 opacity-70">
                  No models found
                </div>
              ) : (
                <>
                  {!modelSearchQuery.trim() && recentModels.length > 0 && (
                    <>
                      <div className="text-xs font-bold uppercase mb-2 opacity-60">
                        Recent Models
                      </div>
                      {recentModels.map((model, index) => {
                        const isSelected = index === selectedModelIndex;
                        return (
                          <div
                            key={`recent-${model.providerID}/${model.modelID}`}
                            className={`p-3 rounded cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-theme-primary/20 border border-theme-primary text-theme-foreground"
                                : "bg-theme-background-alt text-theme-foreground"
                            }`}
                            onClick={() => {
                              selectModel(model);
                              setShowModelPicker(false);
                              setModelSearchQuery("");
                              setSelectedModelIndex(0);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium">{model.name}</div>
                                <div className="text-xs opacity-70">
                                  {model.providerID}/{model.modelID}
                                </div>
                              </div>
                              {isSelected && (
                                <Badge
                                  variant="background2"
                                  cap="square"
                                  className="text-xs"
                                >
                                  ↵
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <Separator className="my-4" />
                      <div className="text-xs font-bold uppercase mb-2 opacity-60">
                        All Models
                      </div>
                    </>
                  )}
                  {filteredModels.map((model, index) => {
                    const adjustedIndex =
                      !modelSearchQuery.trim() && recentModels.length > 0
                        ? index + recentModels.length
                        : index;
                    const isSelected = adjustedIndex === selectedModelIndex;
                    return (
                      <div
                        key={`${model.providerID}/${model.modelID}`}
                        className={`p-3 rounded cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-theme-primary/20 border border-theme-primary text-theme-foreground"
                            : "bg-theme-background-alt text-theme-foreground"
                        }`}
                        onClick={() => {
                          selectModel(model);
                          setShowModelPicker(false);
                          setModelSearchQuery("");
                          setSelectedModelIndex(0);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{model.name}</div>
                            <div className="text-xs opacity-70">
                              {model.providerID}/{model.modelID}
                            </div>
                          </div>
                          {isSelected && (
                            <Badge
                              variant="background2"
                              cap="square"
                              className="text-xs"
                            >
                              ↵
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
            <Separator className="mt-4 mb-4" />
            <div className="flex justify-between items-center">
              <div className="text-xs opacity-70">
                Use ↑↓ arrows to navigate, Enter to select
              </div>
               <Button
                 variant="background2"
                 box="round"
                 onClick={() => {
                   setShowModelPicker(false);
                   setModelSearchQuery("");
                   setSelectedModelIndex(0);
                 }}
                 size="small"
              >
                Cancel
              </Button>
            </div>
          </View>
        </Dialog>
      )}

      {/* Project Picker */}
      {showProjectPicker && (
        <ProjectPicker
          projects={projects}
          currentProject={currentProject}
          onSelect={(project) => {
            switchProject(project);
            setShowProjectPicker(false);
          }}
          onClose={() => setShowProjectPicker(false)}
        />
      )}

      {/* Agent Picker */}
      {showAgentPicker && (
        <AgentPicker
          agents={agents}
          selectedAgent={currentAgent}
          onSelect={selectAgent}
          onClose={() => setShowAgentPicker(false)}
          config={config}
        />
      )}

      {/* Session Picker */}
      {showSessionPicker && (
        <SessionPicker
          sessions={filteredSessions.filter(
            (s) =>
              s.projectID === currentProject?.id ||
              s.directory === currentProject?.worktree,
          )}
          currentSession={currentSession}
          onSelect={switchSession}
          onBulkDelete={handleBulkDeleteClick}
          onNewSession={() => setShowNewSessionForm(true)}
          onClose={() => {
            setShowSessionPicker(false);
            setSpacePassthrough(false);
          }}
          searchQuery={sessionSearchQuery}
          onSearchChange={setSessionSearchQuery}
          filters={sessionFilters}
          onFiltersChange={setSessionFilters}
          onRegisterEditControls={(controls) => {
            sessionPickerEditControls.current = controls;
          }}
          onEditModeChange={handleSessionPickerEditModeChange}
        />
      )}

      {/* Delete Session Confirmation Dialog */}
      {deleteDialogState.open && (
        <Dialog
          open={deleteDialogState.open}
          onClose={() => setDeleteDialogState({ open: false })}
        >
          <View
            className="p-6 rounded border max-w-md"
            style={{
              backgroundColor: "var(--theme-background)",
              borderColor: "var(--theme-border)",
            }}
          >
            <h3 className="text-lg font-bold mb-3">Delete Session</h3>
            <p className="mb-4 text-sm opacity-90">
              Are you sure you want to delete "{deleteDialogState.sessionTitle}
              "? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
               <Button
                 variant="background2"
                 box="round"
                 size="small"
                 onClick={() => setDeleteDialogState({ open: false })}
               >
                Cancel
              </Button>
              <Button
                 variant="error"
                 box="round"
                 size="small"
                 onClick={confirmDelete}
                 className="delete-button-confirm"
              >
                Delete
              </Button>
            </div>
          </View>
        </Dialog>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {bulkDeleteDialogOpen && (
        <Dialog
          open={bulkDeleteDialogOpen}
          onClose={() => setBulkDeleteDialogOpen(false)}
        >
          <View
            className="p-6 rounded border max-w-md"
            style={{
              backgroundColor: "var(--theme-background)",
              borderColor: "var(--theme-border)",
            }}
          >
            <h3 className="text-lg font-bold mb-3">
              Delete {bulkDeleteIds.length} Session
              {bulkDeleteIds.length > 1 ? "s" : ""}
            </h3>
            <p className="mb-4 text-sm opacity-90">
              Are you sure you want to delete {bulkDeleteIds.length} selected
              session{bulkDeleteIds.length > 1 ? "s" : ""}? This action cannot
              be undone.
            </p>
            <div className="flex gap-2 justify-end">
               <Button
                 variant="background2"
                 box="round"
                 size="small"
                 onClick={() => setBulkDeleteDialogOpen(false)}
               >
                Cancel
              </Button>
              <Button
                 variant="error"
                 box="round"
                 size="small"
                 onClick={confirmBulkDelete}
                 className="delete-button-confirm"
              >
                Delete All
              </Button>
            </div>
          </View>
        </Dialog>
      )}

      {/* Permission Modal */}
      {currentPermission && (
        <PermissionModal
          permission={currentPermission}
          isOpen={!!currentPermission}
          onClose={() => {
            setCurrentPermission(null);
            setShouldBlurEditor(false);
          }}
          onRespond={async (response: boolean) => {
            if (currentPermission?.id && currentSession?.id) {
              await openCodeService.respondToPermission(
                currentSession.id,
                currentPermission.id,
                response,
              );
            }
          }}
        />
      )}

      {/* PWA Components */}
      <InstallPrompt />
      <PWAReloadPrompt />
      
      {/* Keyboard Shortcuts Indicator */}
      <KeyboardIndicator keyboardState={keyboardState} />
    </View>
  );
}
