import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { openCodeService, handleOpencodeError } from "@/lib/opencode-client";
import { OpencodeEvent, SSEConnectionState } from "@/lib/opencode-events";
import { getAgentModel, getDefaultModel } from "@/lib/config";
import { parseCommand, ParsedCommand } from "@/lib/commandParser";
import type {
  Agent,
  FileContentData,
  Part,
  PermissionState,
  SessionTodo,
  OpencodeConfig,
  Command,
  SessionUsageTotals,
} from "@/types/opencode";

const isDevEnvironment = process.env.NODE_ENV !== "production";

// Debug logging utility
const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") console.log(...args);
};

const BASE64_ENCODING = "base64";
const TEXT_LIKE_MIME_SNIPPETS = [
  "json",
  "xml",
  "yaml",
  "yml",
  "toml",
  "csv",
  "javascript",
  "typescript",
  "html",
  "css",
  "plain",
  "markdown",
  "shell",
];
const TEXT_LIKE_EXTENSIONS = new Set([
  "txt",
  "text",
  "md",
  "markdown",
  "json",
  "jsonc",
  "yaml",
  "yml",
  "toml",
  "xml",
  "html",
  "htm",
  "css",
  "scss",
  "sass",
  "js",
  "jsx",
  "ts",
  "tsx",
  "cjs",
  "mjs",
  "py",
  "rb",
  "rs",
  "go",
  "java",
  "c",
  "cpp",
  "h",
  "hpp",
  "sql",
  "sh",
  "bash",
  "zsh",
  "env",
  "lock",
  "gitignore",
  "gitattributes",
]);

const TEXT_LIKE_FILENAMES = new Set([
  "license",
  "license.md",
  "license.txt",
  "readme",
  "readme.md",
  "changelog",
  "changelog.md",
  "contributing",
  "contributing.md",
  "conduct",
  "conduct.md",
  "makefile",
  "dockerfile",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  "cargo.toml",
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "bun.lock",
]);

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  reverted?: boolean;
  parts?: Part[];
  metadata?: {
    tokens?: { input: number; output: number; reasoning: number };
    cost?: number;
    model?: string;
    agent?: string;
  };
  toolData?: {
    command?: string;
    output?: string;
    fileDiffs?: Array<{ path: string; diff: string }>;
    shellLogs?: string[];
  };
  optimistic?: boolean;
  error?: boolean;
  errorMessage?: string;
  queued?: boolean; // Indicates message is in queue
  queuePosition?: number; // Position in queue (1-based)
}

interface OpenCodeMessage {
  info?: {
    id?: string;
    role?: string;
    reverted?: boolean;
    time?: {
      created?: number;
    };
  };
  parts?: Part[];
}

interface Session {
  id: string;
  title?: string;
  directory?: string;
  projectID?: string; // Changed from projectId to match SDK
  createdAt?: Date;
  updatedAt?: Date;
  messageCount?: number;
}

interface Project {
  id: string;
  worktree: string;
  vcs?: string;
  time?: {
    created?: number;
    updated?: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

interface FileInfo {
  path: string;
  name: string;
  type: "file" | "directory";
  absolute?: string;
  ignored?: boolean;
  size?: number;
  modifiedAt?: Date;
}

interface Model {
  providerID: string;
  modelID: string;
  name: string;
}

const FALLBACK_MODEL: Model = {
  providerID: "opencode",
  modelID: "big-pickle",
  name: "opencode/big-pickle",
};

type ModelPreference =
  | Model
  | { providerID?: string; modelID?: string }
  | string
  | null
  | undefined;

const parseModelPreference = (
  preference: ModelPreference,
): { providerID?: string; modelID?: string } | null => {
  if (!preference) return null;

  if (typeof preference === "string") {
    const trimmed = preference.trim();
    if (!trimmed) return null;
    if (trimmed.includes("/")) {
      const [providerID, modelID] = trimmed.split("/");
      if (providerID && modelID) {
        return { providerID, modelID };
      }
      if (modelID) {
        return { providerID, modelID };
      }
    }
    return { modelID: trimmed };
  }

  if (typeof preference === "object" && preference !== null) {
    const candidate = preference as { providerID?: string; modelID?: string };
    if ("providerID" in preference || "modelID" in preference) {
      return {
        providerID: candidate.providerID,
        modelID: candidate.modelID,
      };
    }
  }

  return null;
};

const modelsMatch = (a?: Model | null, b?: Model | null): boolean =>
  Boolean(a && b && a.providerID === b.providerID && a.modelID === b.modelID);

const resolveModelPreference = (
  preference: ModelPreference,
  availableModels: Model[],
): Model | null => {
  const parsed = parseModelPreference(preference);
  if (!parsed) return null;

  const providerID = parsed.providerID?.trim() || "";
  const modelID = parsed.modelID?.trim() || "";

  if (!providerID && !modelID) return null;

  if (modelID) {
    const exactMatch = availableModels.find((model) => {
      if (providerID) {
        return (
          model.providerID === providerID && model.modelID === modelID
        );
      }
      return model.modelID === modelID;
    });
    if (exactMatch) return exactMatch;

    if (!providerID) {
      const byId = availableModels.find((model) => model.modelID === modelID);
      if (byId) return byId;
    }

    const resolvedProvider = providerID || FALLBACK_MODEL.providerID;
    return {
      providerID: resolvedProvider,
      modelID,
      name: `${resolvedProvider}/${modelID}`,
    };
  }

  if (providerID) {
    const providerModel = availableModels.find(
      (model) => model.providerID === providerID,
    );
    if (providerModel) return providerModel;
  }

  return FALLBACK_MODEL;
};



interface ProvidersData {
  providers?: {
    id: string;
    name?: string;
    models?:
      | { id: string; name?: string }[]
      | Record<string, { name?: string; [key: string]: unknown }>;
  }[];
  default?: { [key: string]: string };
}

interface ProjectResponse {
  id: string;
  worktree: string;
  vcs?: string;
  time?: {
    created?: number;
    updated?: number;
  };
}

interface SessionResponse {
  id: string;
  title?: string;
  directory?: string;
  projectID?: string;
  time?: {
    created?: number;
    updated?: number;
  };
}

interface FileResponse {
  path: string;
  name: string;
  type: "file" | "directory";
  absolute?: string;
  ignored?: boolean;
  size?: number;
  modifiedAt?: string;
}

export function useOpenCode() {
  console.log("🔥 useOpenCode hook INITIALIZED");
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [fileDirectory, setFileDirectory] = useState<string>(".");
  const [models, setModels] = useState<Model[]>([]);
  const modelsRef = useRef<Model[]>([]);

  // Permission and todo state
  const [currentPermission, setCurrentPermission] =
    useState<PermissionState | null>(null);
  const [shouldBlurEditor, setShouldBlurEditor] = useState(false);
  const [currentSessionTodos, setCurrentSessionTodos] = useState<SessionTodo[]>(
    [],
  );

  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [config, setConfig] = useState<OpencodeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [commands, setCommands] = useState<Command[]>([]);
  const [commandsLoading, setCommandsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [sessionModelMap, setSessionModelMap] = useState<Record<string, Model>>(
    {},
  );
  const [recentModels, setRecentModels] = useState<Model[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("opencode-recent-models");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [sessionActivity, setSessionActivity] = useState<
    Record<string, { running: boolean; lastUpdated: number }>
  >({});
  const [abortInFlight, setAbortInFlight] = useState(false);

  useEffect(() => {
    setFileDirectory(".");
    setFiles([]);
  }, [currentProject?.id, currentPath]);

  const [providersData, setProvidersData] = useState<ProvidersData | null>(
    null,
  );
  const [showHelp, setShowHelp] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [sseConnectionState, setSseConnectionState] =
    useState<SSEConnectionState | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [messageQueue, setMessageQueue] = useState<Message[]>([]);
  const messageQueueRef = useRef<Message[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Frame state management for keyboard navigation
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const frameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [customCommands, setCustomCommands] = useState<
    Array<{ name: string; description: string; template: string }>
  >([]);
  const [sessionUsage, setSessionUsage] = useState<
    Map<string, SessionUsageTotals>
  >(new Map());
  const [agents, setAgents] = useState<Agent[]>([]);
  const [subagents, setSubagents] = useState<Agent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const [loadedModels, setLoadedModels] = useState(false);
  const [loadedConfig, setLoadedConfig] = useState(false);
  const [loadedCustomCommands, setLoadedCustomCommands] = useState(false);
  const loadedAgentsRef = useRef(false);
  const loadedProjectsRef = useRef(false);
  const loadedSessionsRef = useRef(false);
  const loadedCommandsRef = useRef(false);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const currentSessionRef = useRef<Session | null>(null);
  const manualModelSelectionRef = useRef(false);

  useEffect(() => {
    currentSessionRef.current = currentSession;
  }, [currentSession]);

  useEffect(() => {
    modelsRef.current = models;
  }, [models]);

  useEffect(() => {
    manualModelSelectionRef.current = false;
  }, [currentSession?.id]);

  useEffect(() => {
    manualModelSelectionRef.current = false;
  }, [currentAgent?.id]);

  const currentSessionBusy = useMemo(() => {
    if (!currentSession?.id) return false;
    return sessionActivity[currentSession.id]?.running ?? false;
  }, [currentSession?.id, sessionActivity]);

  useEffect(() => {
    if (!isHydrated) return;

    if (manualModelSelectionRef.current) return;

    const agentModel = resolveModelPreference(
      getAgentModel(config, currentAgent),
      models,
    );
    if (agentModel) {
      setSelectedModel(agentModel);
      return;
    }

    const sessionId = currentSession?.id;
    const sessionModel =
      sessionId && sessionModelMap[sessionId]
        ? sessionModelMap[sessionId]
        : null;

    if (sessionModel) {
      setSelectedModel(sessionModel);
      return;
    }

    const configDefaultModel = resolveModelPreference(
      getDefaultModel(config),
      models,
    );
    if (configDefaultModel) {
      setSelectedModel(configDefaultModel);
      return;
    }

    setSelectedModel(FALLBACK_MODEL);
  }, [
    config,
    currentAgent,
    currentSession?.id,
    isHydrated,
    models,
    sessionModelMap,
  ]);

  const markSessionRunning = useCallback((sessionId: string) => {
    setSessionActivity((prev) => ({
      ...prev,
      [sessionId]: { running: true, lastUpdated: Date.now() },
    }));
  }, []);

  const markSessionIdle = useCallback((sessionId: string) => {
    setSessionActivity((prev) => ({
      ...prev,
      [sessionId]: { running: false, lastUpdated: Date.now() },
    }));
  }, []);

  const cleanupSessionActivity = useCallback((sessionId: string) => {
    setSessionActivity((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  }, []);

  // Queue management functions
  const addToQueue = useCallback((message: Message) => {
    setMessageQueue((prev: Message[]) => {
      const newQueue = [...prev, { ...message, queued: true }];
      // Update queue positions
      return newQueue.map((msg: Message, idx: number) => ({
        ...msg,
        queuePosition: idx + 1,
      }));
    });
  }, []);

  const removeFromQueue = useCallback((messageId: string) => {
    setMessageQueue((prev: Message[]) => {
      const filtered = prev.filter((msg: Message) => msg.id !== messageId);
      // Re-index queue positions
      return filtered.map((msg: Message, idx: number) => ({
        ...msg,
        queuePosition: idx + 1,
      }));
    });
    // Also remove from messages display
    setMessages((prev: Message[]) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  const clearQueue = useCallback(() => {
    // Remove all queued messages from the queue
    const queuedIds = messageQueue.map((msg) => msg.id);
    setMessageQueue([]);
    // Also remove queued messages from messages display
    setMessages((prev: Message[]) => prev.filter((msg) => !queuedIds.includes(msg.id)));
  }, [messageQueue]);

  // Placeholder - will be properly defined after sendMessage
  const processNextInQueueRef = useRef<(() => Promise<void>) | null>(null);

  const normalizeProject = useCallback((project: unknown): Project | null => {
    if (!project || typeof project !== "object") return null;
    const value = project as {
      id?: string;
      worktree?: string;
      vcs?: string;
      createdAt?: unknown;
      updatedAt?: unknown;
      time?: { created?: number; updated?: number };
    };
    if (!value.id || !value.worktree) return null;
    const toDate = (input?: unknown) => {
      if (!input) return undefined;
      if (input instanceof Date) return input;
      if (typeof input === "number") {
        const dateFromNumber = new Date(input);
        return Number.isNaN(dateFromNumber.getTime())
          ? undefined
          : dateFromNumber;
      }
      if (typeof input === "string") {
        const dateFromString = new Date(input);
        return Number.isNaN(dateFromString.getTime())
          ? undefined
          : dateFromString;
      }
      return undefined;
    };
    const created =
      toDate(value.createdAt) ??
      (typeof value.time?.created === "number"
        ? toDate(value.time.created * 1000)
        : undefined);
    const updated =
      toDate(value.updatedAt) ??
      (typeof value.time?.updated === "number"
        ? toDate(value.time.updated * 1000)
        : undefined);
    return {
      id: value.id,
      worktree: value.worktree,
      vcs: value.vcs,
      createdAt: created,
      updatedAt: updated,
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedProjectStr = localStorage.getItem("opencode-current-project");
    if (savedProjectStr) {
      try {
        const parsedProject = JSON.parse(savedProjectStr);
        const savedProject = normalizeProject(parsedProject);
        if (process.env.NODE_ENV !== "production")
          console.log(
            "[Hydration] Restoring project from localStorage:",
            savedProject,
          );
        if (savedProject) {
          setCurrentProject(savedProject);
        }
      } catch (error) {
        console.error("[Hydration] Error parsing saved project:", error);
      }
    }

    const savedSessionId = localStorage.getItem("opencode-current-session");
    if (savedSessionId) {
      if (process.env.NODE_ENV !== "production")
        console.log(
          "[Hydration] Restoring session from localStorage:",
          savedSessionId,
        );

      const savedProjectStr = localStorage.getItem("opencode-current-project");
      let projectDirectory: string | undefined;
      if (savedProjectStr) {
        try {
          const savedProject = JSON.parse(savedProjectStr);
          projectDirectory = savedProject.worktree;
        } catch (error) {
          console.error("[Hydration] Error parsing saved project:", error);
        }
      }

      openCodeService
        .getSession(savedSessionId, projectDirectory)
        .then(async (response) => {
          if (response.data) {
            const session = response.data as unknown as {
              id: string;
              title?: string;
              directory?: string;
              projectID?: string;
              time?: { created?: number; updated?: number };
            };
            setCurrentSession({
              id: session.id,
              title: session.title,
              directory: session.directory,
              projectID: session.projectID,
              createdAt: session.time?.created
                ? new Date(session.time.created)
                : undefined,
              updatedAt: session.time?.updated
                ? new Date(session.time.updated)
                : undefined,
            });

            try {
              const messagesResponse = await openCodeService.getMessages(
                savedSessionId,
                projectDirectory,
              );
              const messagesArray =
                (messagesResponse.data as unknown as OpenCodeMessage[]) || [];
              const loadedMessages: Message[] = messagesArray.map(
                (msg: OpenCodeMessage, index: number) => {
                  const parts = msg.parts || [];
                  const textPart = parts.find(
                    (part: Part) => part.type === "text",
                  );
                  const content =
                    (textPart && "text" in textPart ? textPart.text : "") || "";

                  return {
                    id: msg.info?.id || `msg-${index}`,
                    type: msg.info?.role === "user" ? "user" : "assistant",
                    content,
                    parts,
                    timestamp: new Date(msg.info?.time?.created || Date.now()),
                    metadata:
                      msg.info?.role === "assistant" &&
                      "tokens" in (msg.info || {})
                        ? {
                            tokens: (
                              msg.info as {
                                tokens?: {
                                  input: number;
                                  output: number;
                                  reasoning: number;
                                };
                              }
                            ).tokens,
                            cost: (msg.info as { cost?: number }).cost,
                            model: (msg.info as { modelID?: string }).modelID,
                            agent: (msg.info as { mode?: string }).mode,
                          }
                        : undefined,
                  };
                },
              );
              setMessages(loadedMessages);
              if (process.env.NODE_ENV !== "production")
                console.log(
                  "[Hydration] Loaded messages for session:",
                  loadedMessages.length,
                );
            } catch (error) {
              console.error("[Hydration] Error loading messages:", error);
            }
          } else {
            if (process.env.NODE_ENV !== "production")
              console.log(
                "[Hydration] Session not found on server, clearing localStorage",
              );
            localStorage.removeItem("opencode-current-session");
          }
        })
        .catch((error) => {
          console.error("[Hydration] Error loading session:", error);
          localStorage.removeItem("opencode-current-session");
        });
    }

    const savedModelStr = localStorage.getItem("opencode-selected-model");
    if (savedModelStr) {
      try {
        const savedModel = JSON.parse(savedModelStr);
        if (process.env.NODE_ENV !== "production")
          console.log(
            "[Hydration] Restoring model from localStorage:",
            savedModel,
          );
        setSelectedModel(savedModel);
      } catch (error) {
        console.error("[Hydration] Error parsing saved model:", error);
      }
    }

    const savedAgentStr = localStorage.getItem("opencode-current-agent");
    if (savedAgentStr) {
      try {
        const savedAgent = JSON.parse(savedAgentStr);
        if (process.env.NODE_ENV !== "production")
          console.log(
            "[Hydration] Restoring agent from localStorage:",
            savedAgent,
          );
        setCurrentAgent(savedAgent);
      } catch (error) {
        console.error("[Hydration] Error parsing saved agent:", error);
      }
    }

    const savedSessionModelMapStr = localStorage.getItem(
      "opencode-session-model-map",
    );
    if (savedSessionModelMapStr) {
      try {
        const savedMap = JSON.parse(savedSessionModelMapStr);
        if (process.env.NODE_ENV !== "production")
          console.log(
            "[Hydration] Restoring session-model map from localStorage:",
            savedMap,
          );
        setSessionModelMap(savedMap);
      } catch (error) {
        console.error(
          "[Hydration] Error parsing saved session-model map:",
          error,
        );
      }
    }

    const savedActiveTab = localStorage.getItem("opencode-active-tab");
    const savedSelectedFile = localStorage.getItem("opencode-selected-file");
    if (savedActiveTab || savedSelectedFile) {
      if (process.env.NODE_ENV !== "production")
        console.log("[Hydration] Restoring tab/file state from localStorage:", {
          savedActiveTab,
          savedSelectedFile,
        });
    }

    setIsHydrated(true);
  }, [normalizeProject]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await openCodeService.getConfig();
        setIsConnected(!!response.data);
      } catch {
        setIsConnected(false);
      }
    };
    checkConnection();
  }, []);

  const showToast = useCallback(
    async (
      message: string,
      variant: "success" | "error" | "warning" | "info" = "info",
    ) => {
      const result = await openCodeService.showToast(
        message,
        undefined,
        variant,
      );
      if (result?.error) {
        console.error("[Toast] Falling back to console:", result.error);
      }
    },
    [],
  );

  const loadMessages = useCallback(
    async (sessionId: string): Promise<Message[]> => {
      try {
        const response = await openCodeService.getMessages(
          sessionId,
          currentProject?.worktree,
        );
        const messagesArray =
          (response.data as unknown as OpenCodeMessage[]) || [];
        const loadedMessages: Message[] = messagesArray.map(
          (msg: OpenCodeMessage, index: number) => {
            const parts = msg.parts || [];
            const textPart = parts.find((part: Part) => part.type === "text");
            const content =
              (textPart && "text" in textPart ? textPart.text : "") || "";

            const errorInfo = (msg.info as { error?: unknown })?.error;
            const errorMessage =
              typeof (errorInfo as { message?: string })?.message === "string"
                ? (errorInfo as { message: string }).message
                : undefined;

            return {
              id: msg.info?.id || `msg-${index}`,
              type: msg.info?.role === "user" ? "user" : "assistant",
              content,
              parts,
              timestamp: new Date(msg.info?.time?.created || Date.now()),
              reverted: msg.info?.reverted || false,
              metadata:
                "tokens" in (msg.info || {})
                  ? {
                      tokens: (
                        msg.info as {
                          tokens?: {
                            input: number;
                            output: number;
                            reasoning: number;
                          };
                        }
                      ).tokens,
                      cost: (msg.info as { cost?: number }).cost,
                      model: (msg.info as { modelID?: string }).modelID,
                      agent: (msg.info as { mode?: string }).mode,
                    }
                  : undefined,
              optimistic: false,
              error: Boolean(errorInfo),
              errorMessage,
            };
          },
        );

        const activeMessages = loadedMessages.filter((msg) => !msg.reverted);
        const totalTokens = activeMessages.reduce((sum, msg) => {
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
            "[LoadMessages] Loaded",
            loadedMessages.length,
            "messages (",
            activeMessages.length,
            "active,",
            loadedMessages.length - activeMessages.length,
            "reverted) with",
            totalTokens,
            "total tokens",
          );

        seenMessageIdsRef.current.clear();
        loadedMessages.forEach((msg) => seenMessageIdsRef.current.add(msg.id));
        setMessages(loadedMessages);

        const lastAssistantMessage = [...loadedMessages]
          .reverse()
          .find((msg) => msg.type === "assistant" && msg.metadata?.model);
        if (lastAssistantMessage?.metadata?.model) {
          const derivedModel = resolveModelPreference(
            lastAssistantMessage.metadata.model,
            models,
          );
          if (derivedModel) {
            setSessionModelMap((prev) => {
              if (modelsMatch(prev[sessionId], derivedModel)) return prev;
              return {
                ...prev,
                [sessionId]: derivedModel,
              };
            });
          }
        }

        return loadedMessages;
      } catch {
        return [];
      }
    },
    [currentProject, models],
  );

  const currentSessionId = currentSession?.id;
  const currentWorktree = currentProject?.worktree;

  // SSE Event handling for real-time message updates
  useEffect(() => {
    if (!isConnected || !currentSessionId || !isHydrated) return;

    const getEventSessionId = (event: OpencodeEvent): string | undefined => {
      const maybeSessionId = (event.properties as { sessionID?: unknown })
        .sessionID;
      return typeof maybeSessionId === "string" ? maybeSessionId : undefined;
    };

    const handleSSEEvent = (event: OpencodeEvent) => {
      const activeSession = currentSessionRef.current;
      if (event.type !== "lsp.client.diagnostics") {
        debugLog("[SSE] Event received:", event.type);
      }

      const eventSessionId = getEventSessionId(event);
      if (
        eventSessionId &&
        activeSession?.id &&
        eventSessionId !== activeSession.id
      ) {
        debugLog("[SSE] Ignoring event for different session", {
          eventSessionId,
          currentSessionId: activeSession?.id,
        });
        return;
      }

      switch (event.type) {
        case "server.connected": {
          debugLog("[SSE] Server connected");
          break;
        }

        case "installation.updated": {
          const { version } = event.properties;
          if (version) {
            showToast(
              `OpenCode updated to ${version}, restart to apply`,
              "success",
            );
          }
          break;
        }

        case "ide.installed": {
          const { ide } = event.properties;
          if (ide) {
            showToast(`${ide} extension installed successfully`, "success");
          }
          break;
        }

        case "session.updated": {
          const sessionInfo = event.properties.info;
          if (sessionInfo && activeSession?.id === sessionInfo.id) {
            setCurrentSession((prev) =>
              prev?.id === sessionInfo.id ? { ...prev, ...sessionInfo } : prev,
            );
          }
          break;
        }

        case "session.deleted": {
          const sessionInfo = event.properties.info;
          if (sessionInfo?.id) {
            cleanupSessionActivity(sessionInfo.id);
          }
          if (sessionInfo && activeSession?.id === sessionInfo.id) {
            setCurrentSession(null);
            setMessages([]);
            seenMessageIdsRef.current.clear();
            // Clear session usage for deleted session
            setSessionUsage((prev) => {
              const next = new Map(prev);
              next.delete(sessionInfo.id);
              return next;
            });
            showToast("Session was deleted", "info");
          }
          break;
        }

        case "session.compacted": {
          if (event.properties.sessionID === activeSession?.id) {
            showToast("Session compacted successfully", "success");
          }
          break;
        }

        case "session.idle": {
          const sessionId = event.properties.sessionID;
          debugLog("[SSE] session.idle event received!", {
            sessionId,
            activeSessionId: activeSession?.id,
            event: event.properties,
          });
          if (sessionId) {
            markSessionIdle(sessionId);
            debugLog("[SSE] Session idle:", sessionId);
          }
          if (sessionId && sessionId === activeSession?.id) {
            loadMessages(sessionId).catch((error) => {
              console.error(
                "[SSE] Failed to refresh messages after idle:",
                error,
              );
            });

            // PROCESS NEXT QUEUED MESSAGE
            debugLog("[SSE] Queue check:", {
              queueLength: messageQueueRef.current.length,
              hasProcessFunc: !!processNextInQueueRef.current,
              queue: messageQueueRef.current,
              activeSessionId: activeSession?.id,
              eventSessionId: sessionId,
            });
            
            if (messageQueueRef.current.length > 0 && processNextInQueueRef.current) {
              debugLog("[SSE] Processing next queued message after idle");
              processNextInQueueRef.current();
            } else {
              debugLog("[SSE] Not processing queue because:", {
                noMessages: messageQueueRef.current.length === 0,
                noProcessFunc: !processNextInQueueRef.current,
              });
            }
          }
          break;
        }

        case "session.error": {
          const { error } = event.properties;
          if (error) {
            showToast(error.message, "error");
          }
          const sessionId = event.properties.sessionID;
          if (sessionId) {
            markSessionIdle(sessionId);
          }
          if (sessionId && sessionId === activeSession?.id) {
            loadMessages(sessionId).catch((loadError) => {
              console.error(
                "[SSE] Failed to refresh messages after session error:",
                loadError,
              );
            });
          }
          break;
        }

        case "message.updated": {
          const messageInfo = event.properties.info;

          if (!messageInfo?.id) {
            debugLog("[SSE] Skipping message event - no message id");
            return;
          }

          // Reset streaming state when message is updated (completed)
          setIsStreaming(false);
          
          // Clear streaming timeout
          if (streamingTimeoutRef.current) {
            clearTimeout(streamingTimeoutRef.current);
            streamingTimeoutRef.current = null;
          }

          setMessages((prevMessages) => {
            const existingIndex = prevMessages.findIndex(
              (m) => m.id === messageInfo.id,
            );
            const errorInfo = (
              messageInfo as {
                error?: { data?: { message?: string }; message?: string };
              }
            ).error;
            const errorMessage =
              typeof errorInfo?.data?.message === "string"
                ? errorInfo.data.message
                : typeof errorInfo?.message === "string"
                  ? errorInfo.message
                  : undefined;

            if (existingIndex >= 0) {
              const updated = [...prevMessages];
              updated[existingIndex] = {
                ...updated[existingIndex],
                reverted:
                  messageInfo.reverted ?? updated[existingIndex].reverted,
                metadata: messageInfo.tokens
                  ? {
                      tokens: messageInfo.tokens,
                      cost: messageInfo.cost,
                      model: messageInfo.modelID,
                      agent: messageInfo.mode,
                    }
                  : updated[existingIndex].metadata,
                optimistic: false,
                error: Boolean(errorInfo),
                errorMessage,
              };

              debugLog("[SSE] Updated message metadata:", messageInfo.id);
              seenMessageIdsRef.current.add(messageInfo.id);
              return updated;
            }

            const optimisticIndex = prevMessages.findIndex(
              (m) =>
                m.optimistic &&
                m.type === (messageInfo.role === "user" ? "user" : "assistant"),
            );

            if (optimisticIndex >= 0) {
              const updated = [...prevMessages];
              updated[optimisticIndex] = {
                ...updated[optimisticIndex],
                id: messageInfo.id,
                timestamp: new Date(messageInfo.time?.created || Date.now()),
                reverted: messageInfo.reverted || false,
                metadata: messageInfo.tokens
                  ? {
                      tokens: messageInfo.tokens,
                      cost: messageInfo.cost,
                      model: messageInfo.modelID,
                      agent: messageInfo.mode,
                    }
                  : updated[optimisticIndex].metadata,
                optimistic: false,
                error: Boolean(errorInfo),
                errorMessage,
              };

              seenMessageIdsRef.current.add(messageInfo.id);
              debugLog(
                "[SSE] Matched optimistic message with server ID:",
                messageInfo.id,
              );
              return updated;
            }

            if (seenMessageIdsRef.current.has(messageInfo.id)) {
              debugLog(
                "[SSE] Skipping duplicate message creation:",
                messageInfo.id,
              );
              return prevMessages;
            }

            seenMessageIdsRef.current.add(messageInfo.id);

            const newMessage: Message = {
              id: messageInfo.id,
              type: messageInfo.role === "user" ? "user" : "assistant",
              content: "",
              parts: [],
              timestamp: new Date(messageInfo.time?.created || Date.now()),
              reverted: messageInfo.reverted || false,
              metadata: messageInfo.tokens
                ? {
                    tokens: messageInfo.tokens,
                    cost: messageInfo.cost,
                    model: messageInfo.modelID,
                    agent: messageInfo.mode,
                  }
                : undefined,
              optimistic: false,
              error: Boolean(errorInfo),
              errorMessage,
            };

            const newMessages = [...prevMessages, newMessage];
            newMessages.sort(
              (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
            );

            debugLog("[SSE] Added new message placeholder:", messageInfo.id);
            return newMessages;
          });

          // Update session usage totals for assistant messages with tokens
          if (
            messageInfo.tokens &&
            messageInfo.role === "assistant" &&
            eventSessionId
          ) {
            setSessionUsage((prev) => {
              const current = prev.get(eventSessionId) || {
                input: 0,
                output: 0,
                reasoning: 0,
                cacheRead: 0,
                cacheWrite: 0,
                totalTokens: 0,
              };

              // Skip if we've already counted this message
              if (messageInfo.id === current.lastMessageId) {
                return prev;
              }

              const tokens = messageInfo.tokens;
              if (!tokens) return prev;
              const newTotals: SessionUsageTotals = {
                input: current.input + (tokens.input || 0),
                output: current.output + (tokens.output || 0),
                reasoning: current.reasoning + (tokens.reasoning || 0),
                cacheRead: current.cacheRead + (tokens.cache?.read || 0),
                cacheWrite: current.cacheWrite + (tokens.cache?.write || 0),
                totalTokens: 0,
                lastMessageId: messageInfo.id,
              };

              newTotals.totalTokens =
                newTotals.input +
                newTotals.output +
                newTotals.reasoning +
                newTotals.cacheRead +
                newTotals.cacheWrite;

              const next = new Map(prev);
              next.set(eventSessionId, newTotals);
              return next;
            });
          }

          if (
            eventSessionId &&
            messageInfo.role !== "user" &&
            typeof messageInfo.modelID === "string"
          ) {
            const resolvedModel = resolveModelPreference(
              messageInfo.modelID,
              modelsRef.current,
            );
            if (resolvedModel) {
              setSessionModelMap((prev) => {
                if (modelsMatch(prev[eventSessionId], resolvedModel)) {
                  return prev;
                }
                return {
                  ...prev,
                  [eventSessionId]: resolvedModel,
                };
              });
            }
          }
          break;
        }

        case "message.removed": {
          const { messageID } = event.properties;
          if (messageID) {
            setMessages((prevMessages) =>
              prevMessages.filter((msg) => msg.id !== messageID),
            );
            debugLog("[SSE] Removed message:", messageID);
          }
          break;
        }

        case "message.part.updated": {
          const { part, messageID } = event.properties;
          const targetMessageId =
            typeof part?.messageID === "string" ? part.messageID : messageID;

          if (!part || !targetMessageId) {
            debugLog("[SSE] Skipping part update - missing message ID or part");
            return;
          }

          // Set streaming state when we receive message parts
          setIsStreaming(true);
          
          // Clear existing timeout
          if (streamingTimeoutRef.current) {
            clearTimeout(streamingTimeoutRef.current);
          }
          
          // Set timeout to reset streaming state if no parts received for 3 seconds
          streamingTimeoutRef.current = setTimeout(() => {
            setIsStreaming(false);
          }, 3000);

          setMessages((prevMessages) => {
            // Check if message exists, if not create a placeholder
            const existingMessageIndex = prevMessages.findIndex(
              (msg) => msg.id === targetMessageId,
            );
            
            if (existingMessageIndex === -1) {
              // Create placeholder message for incoming parts
              const newMessage: Message = {
                id: targetMessageId,
                type: "assistant", // Assume assistant for incoming parts
                content: "",
                parts: [],
                timestamp: new Date(),
                optimistic: false,
              };
              
              debugLog("[SSE] Created placeholder message for parts:", targetMessageId);
              return [...prevMessages, newMessage];
            }

            return prevMessages.map((msg) => {
              if (msg.id !== targetMessageId) return msg;

              const parts = msg.parts || [];
              const textContent =
                typeof part.text === "string" ? part.text : "";

              if (part.type === "text") {
                const textPartIndex = parts.findIndex((p) => p.type === "text");
                if (textPartIndex >= 0) {
                  const updatedParts = [...parts];
                  updatedParts[textPartIndex] = part;
                  debugLog(
                    "[SSE] Updated text part for message:",
                    msg.id,
                    "length:",
                    textContent.length,
                  );
                  return {
                    ...msg,
                    parts: updatedParts,
                    content: textContent,
                    optimistic: false,
                    error: false,
                    errorMessage: undefined,
                  };
                }

                debugLog(
                  "[SSE] Added new text part for message:",
                  msg.id,
                  "length:",
                  textContent.length,
                );
                return {
                  ...msg,
                  parts: [...parts, part],
                  content: textContent,
                  optimistic: false,
                  error: false,
                  errorMessage: undefined,
                };
              }

              const existingPartIndex = parts.findIndex((p) => {
                if (p.type !== part.type) return false;
                const currentTool = typeof p.tool === "string" ? p.tool : null;
                const incomingTool =
                  typeof part.tool === "string" ? part.tool : null;
                if (currentTool && incomingTool) {
                  return currentTool === incomingTool;
                }
                return true;
              });

              if (existingPartIndex >= 0) {
                const updatedParts = [...parts];
                updatedParts[existingPartIndex] = part;
                debugLog(
                  "[SSE] Updated part type:",
                  part.type,
                  "for message:",
                  msg.id,
                );
                return {
                  ...msg,
                  parts: updatedParts,
                  optimistic: false,
                  error: false,
                  errorMessage: undefined,
                };
              }

              debugLog(
                "[SSE] Added new part type:",
                part.type,
                "for message:",
                msg.id,
              );
              return {
                ...msg,
                parts: [...parts, part],
                optimistic: false,
                error: false,
                errorMessage: undefined,
              };
            });
          });
          break;
        }

        case "message.part.removed": {
          const { messageID, partID } = event.properties;
          if (messageID && partID) {
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === messageID
                  ? {
                      ...msg,
                      parts:
                        msg.parts?.filter(
                          (_, index) => index.toString() !== partID,
                        ) || [],
                    }
                  : msg,
              ),
            );
            debugLog("[SSE] Removed part:", partID, "from message:", messageID);
          }
          break;
        }

        case "permission.updated": {
          const { id, sessionID, message, details, ...rest } = event.properties;
          if (sessionID === activeSession?.id) {
            const permissionPayload: PermissionState = {
              id,
              sessionID,
              message,
              details,
              ...rest,
            };
            setCurrentPermission(permissionPayload);
            setShouldBlurEditor(true);
            debugLog("[SSE] Permission request received:", id);
          }
          break;
        }

        case "permission.replied": {
          const { permissionID, sessionID } = event.properties;
          if (sessionID === activeSession?.id) {
            setCurrentPermission(null);
            setShouldBlurEditor(false);
            debugLog("[SSE] Permission response received:", permissionID);
          }
          break;
        }

        case "file.edited": {
          const { file } = event.properties;
          if (file) {
            debugLog("[SSE] File edited:", file);
          }
          break;
        }

        case "file.watcher.updated": {
          const { file, event: fileEvent } = event.properties;
          if (file && fileEvent) {
            debugLog("[SSE] File watcher update:", file, fileEvent);
          }
          break;
        }

        case "todo.updated": {
          const { sessionID, todos } = event.properties;
          if (sessionID === activeSession?.id && Array.isArray(todos)) {
            setCurrentSessionTodos(todos);
            debugLog("[SSE] Todo items updated for session:", sessionID);
          }
          break;
        }

        case "lsp.client.diagnostics": {
          break;
        }
      }
    };

    const setupSSE = async () => {
      const directory = currentWorktree;
      const { data: connectionState } = await openCodeService.subscribeToEvents(
        currentSessionId,
        handleSSEEvent,
        directory,
      );
      setSseConnectionState(connectionState);
    };

    setupSSE();

    const connectionMonitor = setInterval(() => {
      const currentState = openCodeService.getConnectionState();
      setSseConnectionState(currentState);
    }, 1000);

    return () => {
      clearInterval(connectionMonitor);
      debugLog("[SSE] Cleaning up event subscription");
      openCodeService.unsubscribeFromEvents();
      setSseConnectionState(null);
      
      // Clear streaming timeout
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
        streamingTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isConnected,
    currentSessionId,
    isHydrated,
    currentWorktree,
    showToast,
    loadMessages,
    // processNextInQueueRef.current is used but doesn't need to be in deps (ref pattern)
    // messageQueue.length is accessed via the ref, not directly
  ]);

  // Save current session to localStorage when it changes
  useEffect(() => {
    if (!isHydrated) return;
    if (currentSession) {
      if (process.env.NODE_ENV !== "production")
        console.log("Saving session to localStorage:", currentSession.id);
      localStorage.setItem("opencode-current-session", currentSession.id);
    } else {
      if (process.env.NODE_ENV !== "production")
        console.log("Clearing session from localStorage");
      localStorage.removeItem("opencode-current-session");
    }
  }, [currentSession, isHydrated]);

  // Save selected model to localStorage when it changes
  useEffect(() => {
    if (!isHydrated) return;
    if (selectedModel) {
      localStorage.setItem(
        "opencode-selected-model",
        JSON.stringify(selectedModel),
      );
    }
  }, [selectedModel, isHydrated]);

  // Save current agent to localStorage when it changes
  useEffect(() => {
    if (!isHydrated) return;
    if (currentAgent) {
      localStorage.setItem(
        "opencode-current-agent",
        JSON.stringify(currentAgent),
      );
    }
  }, [currentAgent, isHydrated]);

  // Save session-model map to localStorage when it changes
  useEffect(() => {
    if (!isHydrated) return;
    if (Object.keys(sessionModelMap).length > 0) {
      localStorage.setItem(
        "opencode-session-model-map",
        JSON.stringify(sessionModelMap),
      );
    }
  }, [sessionModelMap, isHydrated]);

  // Save current project to localStorage when it changes
  useEffect(() => {
    if (!isHydrated) return;
    if (currentProject) {
      if (process.env.NODE_ENV !== "production")
        console.log("Saving project to localStorage:", currentProject);
      localStorage.setItem(
        "opencode-current-project",
        JSON.stringify(currentProject),
      );
    } else {
      if (process.env.NODE_ENV !== "production")
        console.log("Clearing project from localStorage");
      localStorage.removeItem("opencode-current-project");
    }
  }, [currentProject, isHydrated]);

  // Clear queue when switching sessions
  useEffect(() => {
    if (currentSession?.id) {
      setMessageQueue([]);
      setIsProcessingQueue(false);
    }
  }, [currentSession?.id]);

  const createSession = useCallback(
    async ({
      title,
      directory,
    }: { title?: string; directory?: string } = {}) => {
      try {
        setLoading(true);
        const sessionDirectory = directory?.trim() || currentProject?.worktree;
        const response = await openCodeService.createSession({
          title,
          directory: sessionDirectory,
        });
        if (response.error) {
          throw new Error(response.error);
        }
        const session = response.data as unknown as
          | {
              id: string;
              title?: string;
              directory?: string;
              projectID?: string;
              createdAt?: string | number;
              updatedAt?: string | number;
            }
          | undefined;
        if (!session) {
          throw new Error("Failed to create session");
        }

        const derivedDirectory = sessionDirectory || session.directory;
        const projectId = session.projectID;

        const newSession: Session = {
          id: session.id,
          title: title || session.title,
          directory: derivedDirectory || session.directory,
          projectID: projectId || currentProject?.id,
          createdAt: session.createdAt
            ? new Date(session.createdAt)
            : new Date(),
          updatedAt: session.updatedAt
            ? new Date(session.updatedAt)
            : undefined,
        };

        let updatedProjects = projects;

        if (projectId || derivedDirectory) {
          try {
            const projectsResponse = await openCodeService.listProjects();
            if (projectsResponse.error) {
              throw new Error(projectsResponse.error);
            }
            const data = projectsResponse.data || [];
            const fetchedProjects: Project[] = (
              Array.isArray(data) ? data : []
            ).map((project: ProjectResponse) => ({
              id: project.id,
              worktree: project.worktree,
              vcs: project.vcs,
              createdAt: project.time?.created
                ? new Date(project.time.created)
                : undefined,
              updatedAt: project.time?.updated
                ? new Date(project.time.updated)
                : undefined,
            }));
            const mergedProjects = new Map<string, Project>();
            projects.forEach((project) =>
              mergedProjects.set(project.id, project),
            );
            fetchedProjects.forEach((project) =>
              mergedProjects.set(project.id, project),
            );
            const mergedProjectList = Array.from(mergedProjects.values());
            setProjects(mergedProjectList);
            loadedProjectsRef.current = true;
            updatedProjects = mergedProjectList;
          } catch (projectError) {
            console.error(
              "Failed to refresh projects after session creation:",
              projectError,
            );
          }
        }

        const targetProject =
          (projectId &&
            updatedProjects.find((project) => project.id === projectId)) ||
          (derivedDirectory &&
            updatedProjects.find(
              (project) => project.worktree === derivedDirectory,
            )) ||
          (projectId && projects.find((project) => project.id === projectId)) ||
          (derivedDirectory &&
            projects.find(
              (project) => project.worktree === derivedDirectory,
            )) ||
          currentProject ||
          null;

        if (targetProject?.id && targetProject.id !== newSession.projectID) {
          newSession.projectID = targetProject.id;
        }

        const isSwitchingProjects =
          Boolean(targetProject?.id) &&
          targetProject?.id !== currentProject?.id;

        if (isSwitchingProjects && targetProject) {
          const normalizedTarget =
            normalizeProject(targetProject) ?? targetProject;
          setCurrentProject(normalizedTarget);
          setSessions([newSession]);
          loadedSessionsRef.current = false;
        } else {
          setSessions((prev) => [newSession, ...prev]);
        }

        setCurrentSession(newSession);
        setMessages([]);
        seenMessageIdsRef.current.clear();
        return newSession;
      } catch (error) {
        console.error("Failed to create session:", error);
        throw new Error(handleOpencodeError(error));
      } finally {
        setLoading(false);
      }
    },
    [currentProject, normalizeProject, projects],
  );

  const sendMessage = useCallback(
    async (
      content: string,
      providerID?: string,
      modelID?: string,
      sessionOverride?: Session,
      agent?: Agent,
    ) => {
      const targetSession = sessionOverride || currentSession;
      if (!targetSession) {
        throw new Error("No active session");
      }

      markSessionRunning(targetSession.id);

      try {
        setLoading(true);
        setIsStreaming(false);
        
        // Clear any existing streaming timeout
        if (streamingTimeoutRef.current) {
          clearTimeout(streamingTimeoutRef.current);
          streamingTimeoutRef.current = null;
        }

        // Check for file references and expand them
        let expandedContent = content;
        const fileMatches = content.match(/@([^\s]+)/g);
        if (fileMatches) {
          for (const match of fileMatches) {
            const filePath = match.slice(1);
            try {
              const fileContent = await readFile(filePath);
              if (fileContent?.text) {
                expandedContent += `\n\nFile: ${filePath}\n${fileContent.text}`;
              }
            } catch (error) {
              console.error("Failed to read file for expansion:", error);
            }
          }
        }

        const effectiveAgent = agent || currentAgent;
        const configModel = getAgentModel(config, effectiveAgent);
        const explicitModel = resolveModelPreference(
          providerID && modelID
            ? { providerID, modelID }
            : providerID
              ? { providerID }
              : modelID
                ? { modelID }
                : null,
          modelsRef.current,
        );
        const resolvedConfigModel = resolveModelPreference(
          configModel,
          modelsRef.current,
        );
        const configDefaultModel = resolveModelPreference(
          getDefaultModel(config),
          modelsRef.current,
        );
        const activeModel =
          explicitModel ||
          selectedModel ||
          resolvedConfigModel ||
          configDefaultModel ||
          FALLBACK_MODEL;

        const effectiveProviderID = providerID || activeModel.providerID;
        const effectiveModelID = modelID || activeModel.modelID;

        // For now, use non-streaming; implement streaming later
        const response = await openCodeService.sendMessage(
          targetSession.id,
          content,
          effectiveProviderID,
          effectiveModelID,
          currentProject?.worktree,
          effectiveAgent || undefined,
        );

        if (response.error) {
          if (
            response.error.includes("ENOENT") ||
            response.error.includes("no such file")
          ) {
            throw new Error(
              "Session not found on server. Please create a new session.",
            );
          }
          throw new Error(response.error);
        }

        // The response contains the message object - extract ID from info
        const responseData = response.data as { info?: { id?: string } };
        const messageId = responseData?.info?.id;

        if (!messageId) {
          console.warn(
            "[SendMessage] No message ID in response, SSE will handle updates",
          );
          // Don't throw error - SSE events will populate the message
          return;
        }

        // Update optimistic entry with authoritative message ID and any expanded content
        setMessages((prev) => {
          const updated = [...prev];
          const optimisticIndex = updated.length - 1;
          if (
            optimisticIndex >= 0 &&
            updated[optimisticIndex]?.type === "user" &&
            "optimistic" in updated[optimisticIndex]
          ) {
            updated[optimisticIndex] = {
              ...updated[optimisticIndex],
              id: messageId,
              content: expandedContent,
              optimistic: false,
            };
          } else {
            updated.push({
              id: messageId,
              type: "user",
              content: expandedContent,
              timestamp: new Date(),
            });
          }
          return updated;
        });

        // Save the model used for this session
        if (targetSession) {
          setSessionModelMap((prev) => ({
            ...prev,
            [targetSession.id]: activeModel,
          }));
        }

        // Return the user message - SSE will handle the assistant response
        return {
          id: messageId,
          content: expandedContent,
        };
      } catch (error) {
        console.error("Failed to send message:", error);
        markSessionIdle(targetSession.id);
        throw new Error(handleOpencodeError(error));
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      currentSession,
      currentProject,
      selectedModel,
      currentAgent,
      config,
      markSessionRunning,
      markSessionIdle,
    ],
  );

  // Process next queued message
  const processNextInQueue = useCallback(async () => {
    debugLog("[Queue] processNextInQueue called", {
      queueLength: messageQueue.length,
      isProcessingQueue,
      loading,
      isStreaming,
    });
    
    if (
      messageQueue.length === 0 ||
      isProcessingQueue ||
      loading ||
      isStreaming
    ) {
      debugLog("[Queue] Early return because:", {
        emptyQueue: messageQueue.length === 0,
        alreadyProcessing: isProcessingQueue,
        currentlyLoading: loading,
        currentlyStreaming: isStreaming,
      });
      return;
    }

    const nextMessage = messageQueue[0];
    if (!nextMessage) {
      debugLog("[Queue] No next message found");
      return;
    }

    debugLog("[Queue] Processing message:", nextMessage);
    setIsProcessingQueue(true);

    try {
      // Remove from queue
      setMessageQueue((prev: Message[]) =>
        prev.slice(1).map((msg: Message, idx: number) => ({
          ...msg,
          queuePosition: idx + 1,
        })),
      );

      // Remove queued message from messages display and add as optimistic
      setMessages((prev: Message[]) => {
        const filtered = prev.filter((msg) => msg.id !== nextMessage.id);
        return [
          ...filtered,
          {
            ...nextMessage,
            queued: false,
            queuePosition: undefined,
            optimistic: true,
          },
        ];
      });

      // Send the queued message
      await sendMessage(
        nextMessage.content,
        selectedModel?.providerID,
        selectedModel?.modelID,
        currentSession ?? undefined,
        currentAgent ?? undefined,
      );
    } catch (error) {
      console.error("[Queue] Failed to process queued message:", error);
      // Re-add to front of queue on error
      setMessageQueue((prev: Message[]) => [nextMessage, ...prev]);
    } finally {
      setIsProcessingQueue(false);
    }
  }, [
    messageQueue,
    isProcessingQueue,
    loading,
    isStreaming,
    sendMessage,
    selectedModel,
    currentSession,
    currentAgent,
  ]);

  // Update the refs
  useEffect(() => {
    processNextInQueueRef.current = processNextInQueue;
    debugLog("[Queue] Updated processNextInQueueRef", {
      hasFunction: !!processNextInQueueRef.current,
    });
  }, [processNextInQueue]);

  useEffect(() => {
    messageQueueRef.current = messageQueue;
    debugLog("[Queue] Updated messageQueueRef", {
      queueLength: messageQueueRef.current.length,
      queue: messageQueueRef.current,
    });
  }, [messageQueue]);

  // ALTERNATIVE QUEUE PROCESSING TRIGGER: Monitor when session becomes idle
  useEffect(() => {
    // Only process queue when session transitions from busy to idle
    const isBusy = loading || isStreaming || currentSessionBusy;
    const hasQueuedMessages = messageQueue.length > 0;
    
    debugLog("[Queue] Session busy state changed:", {
      isBusy,
      loading,
      isStreaming,
      currentSessionBusy,
      hasQueuedMessages,
      queueLength: messageQueue.length,
    });

    if (!isBusy && hasQueuedMessages && !isProcessingQueue) {
      debugLog("[Queue] Session is now idle and queue has messages, processing next...");
      processNextInQueue();
    }
  }, [loading, isStreaming, currentSessionBusy, messageQueue.length, isProcessingQueue, processNextInQueue]);

  // Frame state management functions
  const selectFrame = useCallback((frame: string | null) => {
    if (frameTimeoutRef.current) {
      clearTimeout(frameTimeoutRef.current);
      frameTimeoutRef.current = null;
    }

    setSelectedFrame(frame);

    // Auto-clear frame selection after 3 seconds if no action is taken
    if (frame) {
      frameTimeoutRef.current = setTimeout(() => {
        setSelectedFrame(null);
      }, 3000);
    }
  }, []);

  // Frame actions registry - maps frame names to their available actions
  const frameActions = useMemo(() => ({
    // Projects frame actions
    projects: () => {
      // This will be populated by the keyboard manager when the frame is selected
    },
    // Sessions frame actions  
    sessions: () => {
      // This will be populated by the keyboard manager when the frame is selected
    },
    // Files frame actions
    files: () => {
      // This will be populated by the keyboard manager when the frame is selected
    },
    // Workspace frame actions
    workspace: () => {
      // This will be populated by the keyboard manager when the frame is selected
    },
  }), []);

  const loadProjects = useCallback(async () => {
    if (loadedProjectsRef.current) return;
    try {
      const response = await openCodeService.listProjects(currentPath);
      const data = response.data || [];
      const projectsData: Project[] = (Array.isArray(data) ? data : []).map(
        (project: ProjectResponse) => ({
          id: project.id,
          worktree: project.worktree,
          vcs: project.vcs,
          createdAt: project.time?.created
            ? new Date(project.time.created)
            : undefined,
          updatedAt: project.time?.updated
            ? new Date(project.time.updated)
            : undefined,
        }),
      );
      setProjects(projectsData);
      loadedProjectsRef.current = true;

      if (process.env.NODE_ENV !== "production")
        console.log(
          "[LoadProjects] Loaded projects from API:",
          projectsData.length,
        );
      if (currentProject) {
        const matchingProject = projectsData.find(
          (p) => p.id === currentProject.id,
        );
        if (matchingProject) {
          if (process.env.NODE_ENV !== "production")
            console.log(
              "[LoadProjects] Current project still valid, updating with fresh data",
            );
          setCurrentProject(matchingProject);
        }
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  }, [currentPath, currentProject]);

  const loadSessions = useCallback(async () => {
    if (!currentProject || loadedSessionsRef.current) return;
    try {
      const response = await openCodeService.getSessions(
        currentProject.worktree,
      );
      const data = response.data || [];
      const sessionsData: Session[] = data.map((session: SessionResponse) => ({
        id: session.id,
        title: session.title,
        directory: session.directory,
        projectID: session.projectID || currentProject?.id,
        createdAt: session.time?.created
          ? new Date(session.time.created)
          : undefined,
        updatedAt: session.time?.updated
          ? new Date(session.time.updated)
          : undefined,
        messageCount: undefined,
      }));
      setSessions(sessionsData);
      loadedSessionsRef.current = true;

      if (process.env.NODE_ENV !== "production")
        console.log(
          "[LoadSessions] Loaded sessions from API:",
          sessionsData.length,
        );
      if (process.env.NODE_ENV !== "production")
        console.log("[LoadSessions] Current session state:", currentSession);
      if (process.env.NODE_ENV !== "production")
        console.log("[LoadSessions] Messages count:", messages.length);

      if (currentSession) {
        const matchingSession = sessionsData.find(
          (s) => s.id === currentSession.id,
        );
        if (matchingSession) {
          if (process.env.NODE_ENV !== "production")
            console.log(
              "[LoadSessions] Updating current session with full data:",
              matchingSession,
            );
          setCurrentSession(matchingSession);
          if (messages.length === 0) {
            if (process.env.NODE_ENV !== "production")
              console.log(
                "[LoadSessions] Loading messages for session:",
                currentSession.id,
              );
            await loadMessages(currentSession.id);
          }
        } else {
          if (process.env.NODE_ENV !== "production")
            console.log(
              "[LoadSessions] Current session not found in loaded sessions, clearing",
            );
          setCurrentSession(null);
        }
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  }, [currentProject, currentSession, loadMessages, messages.length]);

  const switchSession = useCallback(
    async (sessionId: string) => {
      try {
        const session = sessions.find((s) => s.id === sessionId);
        if (session) {
          setCurrentSession(session);
          await loadMessages(sessionId);

          // Restore the last used model for this session
          if (sessionModelMap[sessionId]) {
            manualModelSelectionRef.current = false;
            setSelectedModel(sessionModelMap[sessionId]);
          }
        }
      } catch (error) {
        console.error("Failed to switch session:", error);
      }
    },
    [sessions, loadMessages, sessionModelMap],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await openCodeService.deleteSession(
          sessionId,
          currentProject?.worktree,
        );
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        // Clear session usage for deleted session
        setSessionUsage((prev) => {
          const next = new Map(prev);
          next.delete(sessionId);
          return next;
        });
        if (currentSession?.id === sessionId) {
          setCurrentSession(null);
          setMessages([]);
          seenMessageIdsRef.current.clear();
          // Clear queue when deleting current session
          setMessageQueue([]);
          setIsProcessingQueue(false);
        }
      } catch (error) {
        console.error("Failed to delete session:", error);
      }
    },
    [currentSession, currentProject],
  );

  const clearAllSessions = useCallback(async () => {
    try {
      for (const session of sessions) {
        const directory = session.directory || currentProject?.worktree;
        try {
          await openCodeService.deleteSession(session.id, directory);
        } catch (deleteError) {
          console.error("Failed to delete session during clear:", deleteError);
        }
      }
      setSessions([]);
      setCurrentSession(null);
      setMessages([]);
      seenMessageIdsRef.current.clear();
      // Clear all session usage
      setSessionUsage(new Map());
      // Clear queue
      setMessageQueue([]);
      setIsProcessingQueue(false);
    } catch (error) {
      console.error("Failed to clear sessions:", error);
    }
  }, [currentProject?.worktree, sessions]);

  const switchProject = useCallback(async (project: Project) => {
    try {
      setCurrentProject(project);
      setCurrentSession(null);
      setMessages([]);
      seenMessageIdsRef.current.clear();
      setSessions([]);
      loadedSessionsRef.current = false; // Reset flag before fetching
      const response = await openCodeService.getSessions(project.worktree);
      const data = response.data || [];
      const sessionsData: Session[] = data.map((session: SessionResponse) => ({
        id: session.id,
        title: session.title,
        directory: session.directory,
        projectID: session.projectID || project.id, // Ensure projectID is set
        createdAt: session.time?.created
          ? new Date(session.time.created)
          : undefined,
        updatedAt: session.time?.updated
          ? new Date(session.time.updated)
          : undefined,
        messageCount: undefined,
      }));
      setSessions(sessionsData);
      loadedSessionsRef.current = true; // Prevent loadSessions from running again
    } catch (error) {
      console.error("Failed to switch project:", error);
    }
  }, []);

  const loadFiles = useCallback(
    async (directory?: string) => {
      try {
        const targetPath = directory || fileDirectory;
        const baseDirectory =
          currentProject?.worktree ?? currentPath ?? undefined;
        const response = await openCodeService.listFiles(
          targetPath,
          baseDirectory,
        );
        const data = response.data || [];
        const filesData: FileInfo[] = Array.isArray(data)
          ? data.map((file: FileResponse) => ({
              path: file.path,
              name: file.name,
              type: file.type,
              absolute: file.absolute,
              ignored: file.ignored,
              size: file.size,
              modifiedAt: file.modifiedAt
                ? new Date(file.modifiedAt)
                : undefined,
            }))
          : [];
        setFiles(filesData);
        setFileDirectory(targetPath);
      } catch (error) {
        console.error("Failed to load files:", error);
      }
    },
    [fileDirectory, currentProject, currentPath],
  );

  const decodeBase64ToUtf8 = useCallback((raw: string): string | null => {
    try {
      if (typeof globalThis.atob === "function") {
        const binary = globalThis.atob(raw);
        if (typeof TextDecoder !== "undefined") {
          const decoder = new TextDecoder();
          const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
          return decoder.decode(bytes);
        }
        return binary;
      }
    } catch (error) {
      if (isDevEnvironment) {
        console.error("Failed to decode base64 via atob:", error);
      }
    }

    if (typeof Buffer !== "undefined") {
      try {
        return Buffer.from(raw, "base64").toString("utf-8");
      } catch (error) {
        if (isDevEnvironment) {
          console.error("Failed to decode base64 via Buffer:", error);
        }
      }
    }

    return null;
  }, []);

  const shouldDecodeAsText = useCallback(
    (mimeType: string | null, filePath: string) => {
      const baseName = filePath.split(/[\\/]/).pop() ?? "";
      const normalizedBaseName = baseName.toLowerCase();
      const extension = normalizedBaseName.includes(".")
        ? (normalizedBaseName.split(".").pop() ?? "")
        : "";
      const isTextByExtension = extension
        ? TEXT_LIKE_EXTENSIONS.has(extension)
        : false;
      const isTextByName = TEXT_LIKE_FILENAMES.has(normalizedBaseName);

      if (!mimeType) {
        return isTextByExtension || isTextByName;
      }

      const normalized = mimeType.toLowerCase();
      if (normalized.startsWith("text/")) return true;
      if (normalized.includes("charset=")) return true;
      if (
        TEXT_LIKE_MIME_SNIPPETS.some((snippet) => normalized.includes(snippet))
      )
        return true;
      if (
        normalized === "application/octet-stream" &&
        (isTextByExtension || isTextByName)
      ) {
        return true;
      }
      return isTextByExtension || isTextByName;
    },
    [],
  );

  const buildDataUrl = (
    content: string,
    encoding: string | null,
    mimeType: string | null,
  ) => {
    if (encoding !== BASE64_ENCODING) return null;
    const safeMime =
      mimeType && mimeType.trim() ? mimeType : "application/octet-stream";
    return `data:${safeMime};base64,${content}`;
  };

  const buildFileContent = useCallback(
    (
      filePath: string,
      content: string,
      encoding: string | null,
      mimeType: string | null,
    ): FileContentData => {
      const normalizedEncoding =
        typeof encoding === "string" ? encoding.trim().toLowerCase() : null;
      let text: string | null = null;
      if (!normalizedEncoding) {
        text = content;
      } else if (
        normalizedEncoding === BASE64_ENCODING &&
        shouldDecodeAsText(mimeType, filePath)
      ) {
        text = decodeBase64ToUtf8(content) ?? content;
      }

      return {
        content,
        encoding: normalizedEncoding,
        mimeType: mimeType ?? null,
        text,
        dataUrl: buildDataUrl(content, normalizedEncoding, mimeType ?? null),
      };
    },
    [decodeBase64ToUtf8, shouldDecodeAsText],
  );

  const readFile = useCallback(
    async (filePath: string): Promise<FileContentData | null> => {
      try {
        const baseDirectory =
          currentProject?.worktree ?? currentPath ?? undefined;
        const response = await openCodeService.readFile(
          filePath,
          baseDirectory,
        );
        const data = response.data;
        if (!data) {
          return null;
        }

        if (typeof data === "string") {
          return buildFileContent(filePath, data, null, null);
        }

        if (typeof data === "object") {
          if ("content" in data && typeof data.content === "string") {
            const encoding =
              "encoding" in data && typeof data.encoding === "string"
                ? data.encoding
                : null;
            const mimeType =
              "mimeType" in data && typeof data.mimeType === "string"
                ? data.mimeType
                : null;
            return buildFileContent(filePath, data.content, encoding, mimeType);
          }
          if ("diff" in data && typeof data.diff === "string") {
            return buildFileContent(filePath, data.diff, null, "text/plain");
          }
          const fallback = JSON.stringify(data);
          return buildFileContent(filePath, fallback, null, "application/json");
        }

        return null;
      } catch (error) {
        console.error("Failed to read file:", error);
        return null;
      }
    },
    [buildFileContent, currentProject, currentPath],
  );

  const searchText = useCallback(async (query: string) => {
    try {
      const response = await openCodeService.searchText(query);
      const results = Array.isArray(response.data) ? response.data : [];
      return results;
    } catch (error) {
      console.error("Failed to search text:", error);
      return [];
    }
  }, []);

  const searchFiles = useCallback(
    async (query: string) => {
      try {
        const baseDirectory =
          currentProject?.worktree ?? currentPath ?? undefined;
        const response = await openCodeService.findFiles(query, baseDirectory);
        const results = Array.isArray(response.data) ? response.data : [];
        return results;
      } catch (error) {
        console.error("Failed to search files:", error);
        return [];
      }
    },
    [currentProject?.worktree, currentPath],
  );

  const loadCustomCommands = useCallback(async () => {
    if (loadedCustomCommands) return;
    try {
      const files = await searchFiles("command/*.md");
      const commands = await Promise.all(
        files.map(async (file) => {
          const fileData = await readFile(file);
          const content = fileData?.text;
          if (content) {
            const frontmatterMatch = content.match(
              /^---\n([\s\S]*?)\n---\n([\s\S]*)$/,
            );
            if (frontmatterMatch) {
              const frontmatter = frontmatterMatch[1];
              const template = frontmatterMatch[2];
              const descriptionMatch = frontmatter.match(/description:\s*(.+)/);
              const description = descriptionMatch ? descriptionMatch[1] : "";
              const name = file.split("/").pop()?.replace(".md", "") || "";
              return { name, description, template };
            }
          }
          return null;
        }),
      );
      setCustomCommands(
        commands.filter(Boolean) as Array<{
          name: string;
          description: string;
          template: string;
        }>,
      );
      setLoadedCustomCommands(true);
    } catch {
      // Silently handle errors when server is unavailable
      setLoadedCustomCommands(true);
    }
  }, [readFile, searchFiles, loadedCustomCommands]);

  // Model selection
  const loadModels = useCallback(async () => {
    if (loadedModels) return;
    try {
      if (process.env.NODE_ENV !== "production")
        console.log("Loading models...");
      const response = await openCodeService.getProviders();
      if (process.env.NODE_ENV !== "production")
        console.log("Providers response:", response);
      const providersData = response.data as ProvidersData | undefined;
      if (process.env.NODE_ENV !== "production")
        console.log("Providers data:", providersData);
      setProvidersData(providersData || null);
      if (
        providersData &&
        providersData.providers &&
        Array.isArray(providersData.providers)
      ) {
        const availableModels: Model[] = [];
        providersData.providers.forEach(
          (provider: {
            id: string;
            name?: string;
            models?:
              | { id: string; name?: string }[]
              | Record<string, { name?: string; [key: string]: unknown }>;
          }) => {
            if (process.env.NODE_ENV !== "production")
              console.log("Processing provider:", provider);
            if (provider.models && typeof provider.models === "object") {
              Object.entries(provider.models).forEach(
                ([modelId, modelData]: [
                  string,
                  { name?: string; [key: string]: unknown },
                ]) => {
                  availableModels.push({
                    providerID: provider.id,
                    modelID: modelId,
                    name:
                      modelData.name ||
                      `${provider.name || provider.id} ${modelId}`,
                  });
                },
              );
            } else if (provider.models && Array.isArray(provider.models)) {
              (provider.models as { id: string; name?: string }[]).forEach(
                (model: { id: string; name?: string }) => {
                  availableModels.push({
                    providerID: provider.id,
                    modelID: model.id,
                    name:
                      model.name ||
                      `${provider.name || provider.id} ${model.id}`,
                  });
                },
              );
            }
          },
        );
        if (process.env.NODE_ENV !== "production")
          console.log("Available models:", availableModels);
        setModels(availableModels);
        setLoadedModels(true);
      }
    } catch {
      const dummyModels: Model[] = [
        {
          providerID: "anthropic",
          modelID: "claude-3-5-sonnet-20241022",
          name: "Claude 3.5 Sonnet",
        },
        { providerID: "openai", modelID: "gpt-4", name: "GPT-4" },
      ];
      setModels(dummyModels);
      setLoadedModels(true);
    }
  }, [loadedModels]);

  const selectModel = useCallback(
    (model: Model) => {
      manualModelSelectionRef.current = true;
      setSelectedModel(model);
      if (currentSession?.id) {
        setSessionModelMap((prev) => ({
          ...prev,
          [currentSession.id]: model,
        }));
      }
      
      setRecentModels((prev) => {
        const filtered = prev.filter(
          (m) => !(m.providerID === model.providerID && m.modelID === model.modelID)
        );
        const updated = [model, ...filtered].slice(0, 5);
        if (typeof window !== "undefined") {
          localStorage.setItem("opencode-recent-models", JSON.stringify(updated));
        }
        return updated;
      });
    },
    [currentSession],
  );

  // Config and path
  const loadConfig = useCallback(async ({ force }: { force?: boolean } = {}) => {
    if (loadedConfig && !force) return config ?? null;
    try {
      setConfigLoading(true);
      const response = await openCodeService.getConfig();
      const configData = response.data as OpencodeConfig | undefined;
      setConfig(configData || null);
      setLoadedConfig(true);
      return configData || null;
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to load config:", error);
      }
      return null;
    } finally {
      setConfigLoading(false);
    }
  }, [loadedConfig, config]);

  const loadCommands = useCallback(async () => {
    try {
      setCommandsLoading(true);
      const response = await openCodeService.getCommands();
      console.log("getCommands response:", response);
      const commandsData = response.data as Record<string, unknown> | undefined;
      console.log("commandsData:", commandsData);

      if (!commandsData) {
        console.log("No commands data, setting empty array");
        setCommands([]);
        return [];
      }

       const commandList: Command[] = Object.entries(commandsData).map(
         ([name, cmd]: [string, unknown]) => {
           const cmdObj = cmd as Record<string, unknown>;
           const actualName = (cmdObj as Record<string, unknown> & { name?: string }).name || name;
           return {
             name: actualName,
             description:
               typeof cmdObj.description === "string"
                 ? cmdObj.description
                 : undefined,
             agent:
               typeof cmdObj.agent === "string" ? cmdObj.agent : undefined,
             model:
               cmdObj.model &&
               typeof cmdObj.model === "object" &&
               "providerID" in cmdObj.model &&
               "modelID" in cmdObj.model
                 ? {
                     providerID: String(cmdObj.model.providerID),
                     modelID: String(cmdObj.model.modelID),
                   }
                 : undefined,
             prompt:
               typeof cmdObj.prompt === "string" 
                 ? cmdObj.prompt 
                 : typeof cmdObj.template === "string"
                   ? cmdObj.template
                   : undefined,
             trigger: Array.isArray(cmdObj.trigger)
               ? cmdObj.trigger.map(String)
               : [`/${actualName}`],
             custom:
               typeof cmdObj.custom === "boolean" ? cmdObj.custom : true,
           };
         },
       );

      console.log("Parsed command list:", commandList);
      setCommands(commandList);
      return commandList;
    } catch (error) {
      console.error("Failed to load commands:", error);
      return [];
    } finally {
      setCommandsLoading(false);
    }
  }, []);

  const loadCurrentPath = useCallback(async () => {
    try {
      const response = await openCodeService.getCurrentPath();
      const pathData = response.data as { path?: string } | undefined;
      setCurrentPath(pathData?.path || "");
    } catch (error) {
      console.error("Failed to load current path:", error);
    }
  }, []);

  // TUI controls
  const openHelp = useCallback(async () => {
    // Open help dialog in frontend
    setShowHelp(true);
  }, []);

  const openSessions = useCallback(async () => {
    try {
      await openCodeService.openSessions();
    } catch (error) {
      console.error("Failed to open sessions:", error);
    }
  }, []);

  const openThemes = useCallback(async () => {
    // Open themes dialog in frontend
    setShowThemes(true);
  }, []);

  const openModels = useCallback(async () => {
    try {
      await openCodeService.openModels();
    } catch (error) {
      console.error("Failed to open models:", error);
    }
  }, []);

  // Agent management
  const loadAgents = useCallback(async () => {
    if (loadedAgentsRef.current) return;
    try {
      const response = await openCodeService.getAgents();
      const allAgents: Agent[] = Array.isArray(response.data)
        ? response.data
        : [];
      const agentsArray = allAgents.filter(
        (agent) => agent.mode === "primary" || agent.mode === "all" || !agent.mode
      );
      setAgents(agentsArray);
      
      const subagentsArray = allAgents.filter(
        (agent) => agent.mode === "subagent" || agent.mode === "all"
      );
      setSubagents(subagentsArray);
      
      loadedAgentsRef.current = true;

      // Try to restore saved agent from localStorage
      const savedAgentStr = localStorage.getItem("opencode-current-agent");
      if (savedAgentStr && !currentAgent) {
        try {
          const savedAgent = JSON.parse(savedAgentStr);
          const savedId = savedAgent.id || savedAgent.name;
          const matchingAgent = agentsArray.find((a) => {
            const agentId = a.id || a.name;
            return agentId === savedId;
          });
          if (matchingAgent) {
            setCurrentAgent(matchingAgent);
          } else if (agentsArray.length > 1) {
            setCurrentAgent(agentsArray[1]);
          } else if (agentsArray.length > 0) {
            setCurrentAgent(agentsArray[0]);
          }
        } catch {
          if (agentsArray.length > 1) {
            setCurrentAgent(agentsArray[1]);
          } else if (agentsArray.length > 0) {
            setCurrentAgent(agentsArray[0]);
          }
        }
      } else if (agentsArray.length > 1 && !currentAgent) {
        setCurrentAgent(agentsArray[1]);
      } else if (agentsArray.length > 0 && !currentAgent) {
        setCurrentAgent(agentsArray[0]);
      }
    } catch {
      // Silently handle errors when server is unavailable
      loadedAgentsRef.current = true;
    }
  }, [currentAgent]);

  const selectAgent = useCallback((agent: Agent) => {
    setCurrentAgent(agent);
    manualModelSelectionRef.current = false;
    
    const agentModel = resolveModelPreference(
      getAgentModel(config, agent),
      modelsRef.current,
    );
    if (agentModel) {
      setSelectedModel(agentModel);
    }
  }, [config]);

  useEffect(() => {
    loadProjects();
    loadConfig();
    loadModels();
    loadCustomCommands();
    loadAgents();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isHydrated || loadedCommandsRef.current) return;

    console.log("loadCommands useEffect check:", { isHydrated });
    console.log("Calling loadCommands...");

    loadedCommandsRef.current = true;
    loadCommands().catch(() => {
      loadedCommandsRef.current = false;
    });
  }, [isHydrated, loadCommands]);

  const currentProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentProject) {
      const projectIdChanged =
        currentProjectIdRef.current !== currentProject.id;
      currentProjectIdRef.current = currentProject.id;

      if (projectIdChanged) {
        if (process.env.NODE_ENV !== "production")
          console.log("Project changed, loading sessions for:", currentProject);
        loadedSessionsRef.current = false; // Reset flag when project changes
        loadSessions();
      }
    }
  }, [currentProject, loadSessions]);

  const extractTextFromParts = useCallback((parts?: Part[]): string => {
    if (!parts || parts.length === 0) return "";

    const textParts = parts.filter(
      (part) => part.type === "text" && "text" in part,
    );
    if (textParts.length > 0) {
      return textParts
        .map((part) => ("text" in part ? part.text : ""))
        .join("\n");
    }

    return "";
  }, []);

  const runShell = useCallback(
    async (sessionId: string, command: string, args: string[] = []) => {
      markSessionRunning(sessionId);
      try {
        const response = await openCodeService.runShell(
          sessionId,
          command,
          args,
          currentProject?.worktree,
        );
        return response;
      } catch (error) {
        console.error("Failed to run shell command:", error);
        markSessionIdle(sessionId);
        throw error;
      }
    },
    [currentProject?.worktree, markSessionRunning, markSessionIdle],
  );

  const revertMessage = useCallback(
    async (sessionId: string, messageID: string) => {
      try {
        const response = await openCodeService.revertMessage(
          sessionId,
          messageID,
          currentProject?.worktree,
        );
        return response;
      } catch (error) {
        console.error("Failed to revert message:", error);
        throw error;
      }
    },
    [currentProject?.worktree],
  );

  const unrevertSession = useCallback(
    async (sessionId: string) => {
      try {
        const response = await openCodeService.unrevertMessage(
          sessionId,
          currentProject?.worktree,
        );
        return response;
      } catch (error) {
        console.error("Failed to unrevert session:", error);
        throw error;
      }
    },
    [currentProject?.worktree],
  );

  const shareSession = useCallback(
    async (sessionId: string) => {
      try {
        const response = await openCodeService.shareSession(
          sessionId,
          currentProject?.worktree,
        );
        return response.data;
      } catch (error) {
        console.error("Failed to share session:", error);
        throw error;
      }
    },
    [currentProject?.worktree],
  );

  const unshareSession = useCallback(
    async (sessionId: string) => {
      try {
        const response = await openCodeService.unshareSession(
          sessionId,
          currentProject?.worktree,
        );
        return response.data;
      } catch (error) {
        console.error("Failed to unshare session:", error);
        throw error;
      }
    },
    [currentProject?.worktree],
  );

  const initSession = useCallback(
    async (
      sessionId: string,
      messageID: string,
      providerID: string,
      modelID: string,
    ) => {
      markSessionRunning(sessionId);
      try {
        const response = await openCodeService.initSession(
          sessionId,
          messageID,
          providerID,
          modelID,
          currentProject?.worktree,
        );
        return response.data;
      } catch (error) {
        console.error("Failed to init session:", error);
        markSessionIdle(sessionId);
        throw error;
      }
    },
    [currentProject?.worktree, markSessionRunning, markSessionIdle],
  );

  const summarizeSession = useCallback(
    async (sessionId: string, providerID: string, modelID: string) => {
      markSessionRunning(sessionId);
      try {
        const response = await openCodeService.summarizeSession(
          sessionId,
          providerID,
          modelID,
          currentProject?.worktree,
        );
        return response.data;
      } catch (error) {
        console.error("Failed to summarize session:", error);
        markSessionIdle(sessionId);
        throw error;
      }
    },
    [currentProject?.worktree, markSessionRunning, markSessionIdle],
  );

  const abortSession = useCallback(
    async (sessionId: string) => {
      try {
        setAbortInFlight(true);
        const response = await openCodeService.abortSession(
          sessionId,
          currentProject?.worktree,
        );

        if (process.env.NODE_ENV !== "production") {
          console.log("[Abort] Session abort requested:", sessionId);
        }

        return response.data;
      } catch (error) {
        console.error("Failed to abort session:", error);
        throw error;
      } finally {
        setAbortInFlight(false);
      }
    },
    [currentProject?.worktree],
  );

  const executeSlashCommand = useCallback(
    async (parsedCommand: ParsedCommand, sessionId?: string) => {
      const targetSessionId = sessionId || currentSession?.id;
      if (!targetSessionId) {
        throw new Error("No active session");
      }

      if (!parsedCommand.matchedCommand) {
        throw new Error(`Unknown command: ${parsedCommand.command}`);
      }

      const cmd = parsedCommand.matchedCommand;

      let prompt = cmd.prompt;

      if (!prompt) {
        throw new Error(`Command "${cmd.name}" has no prompt content`);
      }

      const argsText = parsedCommand.args && parsedCommand.args.length > 0
        ? parsedCommand.args.join(" ")
        : "";

      if (argsText) {
        prompt = prompt.replace(/\$ARGUMENTS/g, argsText);
      } else {
        prompt = prompt.replace(/\$ARGUMENTS/g, "");
      }

      const commandAgent = cmd.agent
        ? agents.find((a) => a.name === cmd.agent || a.id === cmd.agent)
        : currentAgent;

      const commandModel = cmd.model || getAgentModel(config, commandAgent || null);

      return sendMessage(
        prompt,
        commandModel?.providerID,
        commandModel?.modelID,
        currentSession || undefined,
        commandAgent || currentAgent || undefined,
      );
    },
    [currentSession, agents, currentAgent, config, sendMessage],
  );

  const cycleRecentModels = useCallback(() => {
    if (recentModels.length === 0) return;
    
    const currentIndex = selectedModel
      ? recentModels.findIndex(
          (m) => m.providerID === selectedModel.providerID && m.modelID === selectedModel.modelID
        )
      : -1;
    
    const nextIndex = (currentIndex + 1) % recentModels.length;
    selectModel(recentModels[nextIndex]);
  }, [recentModels, selectedModel, selectModel]);

  return {
    currentSession,
    messages,
    setMessages,
    sessions,
    loading,
    createSession,
    sendMessage,
    loadSessions,
    loadMessages,
    switchSession,
    deleteSession,
    clearAllSessions,
    // New features
    projects,
    currentProject,
    switchProject,
    loadProjects,
    files,
    fileDirectory,
    loadFiles,
    searchFiles,

    readFile,
    searchText,
    models,
    selectedModel,
    selectModel,
    loadModels,
    recentModels,
    cycleRecentModels,
    config,
    configLoading,
    loadConfig,
    commands,
    commandsLoading,
    loadCommands,
    currentPath,
    loadCurrentPath,
    providersData,
    isConnected,
    isStreaming,
    isHydrated,
    customCommands,
    openHelp,
    openSessions,
    openThemes,
    openModels,
    showToast,
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
    loadAgents,
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
    sessionActivity,
    executeSlashCommand,
    parseCommand: (input: string) => parseCommand(input, commands),
    sseConnectionState,
    // Permission and todo state
    currentPermission,
    setCurrentPermission,
    shouldBlurEditor,
    setShouldBlurEditor,
    currentSessionTodos,
    setCurrentSessionTodos,
    sessionUsage: currentSession?.id
      ? sessionUsage.get(currentSession.id) || null
      : null,
    // Message queue
    messageQueue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    processNextInQueue,
    isProcessingQueue,
    // Frame state management for keyboard navigation
    selectedFrame,
    selectFrame,
    frameActions,
  };
}
