import { createServerFn } from "@tanstack/react-start";
import { OpencodeHttpError } from "./opencode-http-api";
import * as httpApi from "./opencode-http-api";
import { updateConfigFileLocal, readConfigFromScope } from "./config-file";
import type {
  Agent,
  Part,
  McpStatusResponse,
  Todo,
  PermissionResponse,
  SessionDiffResponse,
  SessionForkResponse,
  OpencodeConfig,
  TuiEvent,
  TuiControlRequest,
  TuiControlResponse,
  LspStatus,
  FormatterStatus,
} from "../types/opencode";

const configFallbackScopes = new Set<string>();
const getScopeKey = (scope: "global" | "project", directory?: string) =>
  scope === "project" ? `project:${directory ?? ""}` : "global";

type ValidationStatus = "ok" | "missing" | "error" | "unknown";

export const getAgents = createServerFn({ method: "GET" }).handler(async () => {
  return httpApi.getAgents();
});

export const getProviders = createServerFn({ method: "GET" }).handler(
  async () => {
    return httpApi.getProviders();
  },
);

export const getSessions = createServerFn({ method: "GET" })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.getSessions(data.directory);
  });

export const getSession = createServerFn({ method: "GET" })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.getSession(data.sessionId, data.directory);
  });

export const createSession = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { title?: string; parentID?: string; directory?: string }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.createSession(
      { title: data.title, parentID: data.parentID },
      data.directory,
    );
  });

export const deleteSession = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.deleteSession(data.sessionId, data.directory);
  });

export const updateSession = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { sessionId: string; title?: string; directory?: string }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.updateSession(
      data.sessionId,
      { title: data.title },
      data.directory,
    );
  });

export const getMessages = createServerFn({ method: "GET" })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.getMessages(data.sessionId, data.directory);
  });

export const getMessage = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { sessionId: string; messageId: string; directory?: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    return httpApi.getMessage(data.sessionId, data.messageId, data.directory);
  });

export const getSessionTodos = createServerFn({ method: "GET" })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }): Promise<Todo[]> => {
    return httpApi.getSessionTodos(data.sessionId, data.directory);
  });

export const sendMessage = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      sessionId: string;
      content: string;
      providerID?: string;
      modelID?: string;
      directory?: string;
      agent?: Agent;
      parts?: Part[];
      messageID?: string;
      noReply?: boolean;
      system?: string;
      tools?: Record<string, unknown>;
    }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.sendMessage(
      data.sessionId,
      data.content,
      data.providerID,
      data.modelID,
      data.directory,
      data.agent,
      data.parts,
      {
        messageID: data.messageID,
        noReply: data.noReply,
        system: data.system,
        tools: data.tools,
      },
    );
  });

export const abortSession = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.abortSession(data.sessionId, data.directory);
  });

export const shareSession = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.shareSession(data.sessionId, data.directory);
  });

export const unshareSession = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.unshareSession(data.sessionId, data.directory);
  });

export const forkSession = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      sessionId: string;
      messageID?: string;
      title?: string;
      directory?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.forkSession(
      data.sessionId,
      { messageID: data.messageID, title: data.title },
      data.directory,
    );
  });

export const revertMessage = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      sessionId: string;
      messageID: string;
      directory?: string;
      partID?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.revertMessage(
      data.sessionId,
      data.messageID,
      data.directory,
      data.partID,
    );
  });

export const unrevertSession = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.unrevertSession(data.sessionId, data.directory);
  });

export const runCommand = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      sessionId: string;
      command: string;
      args?: string[];
      directory?: string;
      agent?: string;
      arguments?: unknown;
      messageID?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.runCommand(
      data.sessionId,
      data.command,
      data.args,
      data.directory,
      data.agent,
      { arguments: data.arguments, messageID: data.messageID },
    );
  });

export const findFiles = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { query: string; directory?: string; dirs?: boolean }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.findFiles(data.query, data.directory, data.dirs);
  });

export const findInFiles = createServerFn({ method: "GET" })
  .inputValidator((data: { pattern: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.findInFiles(data.pattern, data.directory);
  });

export const findSymbols = createServerFn({ method: "GET" })
  .inputValidator((data: { query: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.findSymbols(data.query, data.directory);
  });

export const readFile = createServerFn({ method: "GET" })
  .inputValidator((data: { filePath: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.readFile(data.filePath, data.directory);
  });

export const getFileStatus = createServerFn({ method: "GET" })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.getFileStatus(data.directory);
  });

export const getSessionDiff = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { sessionId: string; directory?: string; messageID?: string }) =>
      data,
  )
  .handler(async ({ data }): Promise<SessionDiffResponse> => {
    return httpApi.getFileDiff(data.sessionId, {
      directory: data.directory,
      messageID: data.messageID,
    });
  });

export const respondToPermission = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      sessionId: string;
      permissionId: string;
      response: PermissionResponse;
      directory?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.respondToPermission(
      data.sessionId,
      data.permissionId,
      data.response,
      data.directory,
    );
  });

export const getConfig = createServerFn({ method: "GET" })
  .inputValidator(
    (data?: { directory?: string; scope?: "global" | "project" }) =>
      data ?? {},
  )
  .handler(async ({ data }) => {
    const scope = data.scope ?? (data.directory ? "project" : "global");
    if (scope === "project" && !data.directory) {
      throw new Error(
        "Project directory is required when requesting project-scoped config",
      );
    }

    const scopeDirectory = scope === "project" ? data.directory : undefined;
    const key = getScopeKey(scope, scopeDirectory);

    if (configFallbackScopes.has(key)) {
      const fallback = await readConfigFromScope(scope, scopeDirectory);
      return fallback ?? ({} as OpencodeConfig);
    }

    try {
      const config = await httpApi.getConfig({
        scope,
        directory: scopeDirectory,
      });
      configFallbackScopes.delete(key);
      return config;
    } catch (error) {
      if (error instanceof OpencodeHttpError && error.status >= 500) {
        console.warn(
          `[config] Remote get failed (${error.message}). Reading ${scope} config directly from file.`,
        );
        const fallback = await readConfigFromScope(scope, scopeDirectory);
        configFallbackScopes.add(key);
        return fallback ?? ({} as OpencodeConfig);
      }
      throw error;
    }
  });

export const getSessionChildren = createServerFn({ method: "GET" })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.getSessionChildren(data.sessionId, data.directory);
  });

export const initSession = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      sessionId: string;
      messageID: string;
      providerID: string;
      modelID: string;
      directory?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.initSession(
      data.sessionId,
      data.messageID,
      data.providerID,
      data.modelID,
      data.directory,
    );
  });

export const summarizeSession = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      sessionId: string;
      providerID: string;
      modelID: string;
      directory?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.summarizeSession(
      data.sessionId,
      data.providerID,
      data.modelID,
      data.directory,
    );
  });

export const appendPrompt = createServerFn({ method: "POST" })
  .inputValidator((data: { text: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.appendPrompt(data.text);
  });

export const submitPrompt = createServerFn({ method: "POST" }).handler(
  async () => {
    return httpApi.submitPrompt();
  },
);

export const clearPrompt = createServerFn({ method: "POST" }).handler(
  async () => {
    return httpApi.clearPrompt();
  },
);

export const executeCommand = createServerFn({ method: "POST" })
  .inputValidator((data: { command: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.executeCommand(data.command);
  });

export const showToast = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      message: string;
      title?: string;
      variant?: "success" | "error" | "warning" | "info";
    }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.showToast(data.message, data.title, data.variant);
  });

export const openTuiHelp = createServerFn({ method: "POST" })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.openTuiHelp(data.directory);
  });

export const openTuiSessions = createServerFn({ method: "POST" })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.openTuiSessions(data.directory);
  });

export const openTuiThemes = createServerFn({ method: "POST" })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.openTuiThemes(data.directory);
  });

export const openTuiModels = createServerFn({ method: "POST" })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.openTuiModels(data.directory);
  });

export const publishTuiEvent = createServerFn({ method: "POST" })
  .inputValidator((data: { event: TuiEvent; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.publishTuiEvent(data.event, data.directory);
  });

export const getNextTuiControlRequest = createServerFn({ method: "GET" })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }): Promise<TuiControlRequest | null> => {
    return httpApi.getNextTuiControlRequest(data.directory);
  });

export const respondToTuiControl = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { response: TuiControlResponse; directory?: string }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.respondToTuiControl(data.response, data.directory);
  });

export const listProjects = createServerFn({ method: "GET" })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.listProjects(data.directory);
  });

export const getCurrentProject = createServerFn({ method: "GET" })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.getCurrentProject(data.directory);
  });

export const getCurrentPath = createServerFn({ method: "GET" })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.getCurrentPath(data.directory);
  });

export const listFiles = createServerFn({ method: "GET" })
  .inputValidator((data: { path: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    return httpApi.listFiles(data.path, data.directory);
  });

export const getToolIds = createServerFn({ method: "GET" })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.getToolIds(data.directory);
  });

export const getTools = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { provider: string; model: string; directory?: string }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.getTools(data.provider, data.model, data.directory);
  });

export const validateProjectWorktrees = createServerFn({ method: "POST" })
  .inputValidator((data: { worktrees: string[] }) => data)
  .handler(async ({ data }) => {
    const { worktrees } = data;

    if (!Array.isArray(worktrees)) {
      throw new Error("worktrees must be an array");
    }

    // Deduplicate paths
    // We do NOT use path.resolve() here because the paths are on the OpenCode server,
    // which might be on a different host with a different filesystem structure.
    const uniquePaths = Array.from(
      new Set(
        worktrees
          .filter((p): p is string => typeof p === "string" && p.length > 0),
      ),
    );

    const results: Record<string, ValidationStatus> = {};

    // Process paths concurrently with a cap of 5 at a time
    const concurrencyLimit = 5;
    for (let i = 0; i < uniquePaths.length; i += concurrencyLimit) {
      const batch = uniquePaths.slice(i, i + concurrencyLimit);

      const batchPromises = batch.map(async (p) => {
        try {
          // Use listFiles with directory scoped to the worktree; path "." to avoid absolute issues
          await httpApi.listFiles(".", p);
          return { path: p, status: "ok" as const };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const statusCode =
            error instanceof OpencodeHttpError ? error.status : undefined;
          const isMissing =
            statusCode === 404 ||
            errorMessage.includes("Not Found") ||
            errorMessage.includes("404") ||
            errorMessage.includes("ENOENT") ||
            errorMessage.includes("Internal Server Error");

          const status = isMissing ? ("missing" as const) : ("unknown" as const);

          if (process.env.NODE_ENV !== "production" && status === "unknown") {
            console.warn(`[validateProjectWorktrees] Non-missing error for ${p}:`, error);
          }

          return { path: p, status };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach(({ path: p, status }) => {
        results[p] = status;
      });
    }

    return { existing: results };
  });
export const getCommands = createServerFn({ method: "GET" })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    return httpApi.getCommands(data.directory);
  });

export const updateConfig = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      config: Record<string, unknown>;
      directory?: string;
      scope?: "global" | "project"
    }) => data,
  )
  .handler(async ({ data }) => {
    const resolvedScope = data.scope ?? (data.directory ? "project" : "global");
    if (resolvedScope === "project" && !data.directory) {
      throw new Error(
        "Project directory is required for project-scoped config updates",
      );
    }
    const scopeDirectory =
      resolvedScope === "project" ? data.directory : undefined;
    const scopeKey = getScopeKey(resolvedScope, scopeDirectory);
    try {
      const result = await httpApi.updateConfig(data.config, {
        directory: scopeDirectory,
        scope: resolvedScope,
      });
      configFallbackScopes.delete(scopeKey);
      return result as any;
    } catch (error) {
      if (error instanceof OpencodeHttpError && error.status >= 500) {
        console.warn(
          `[config] Remote update failed (${error.message}). Attempting local config file update for ${resolvedScope} scope.`,
        );
        const fallback = await updateConfigFileLocal(
          data.config,
          resolvedScope,
          scopeDirectory,
        );
        configFallbackScopes.add(scopeKey);
        return fallback as any;
      }
      throw error;
    }
  });

export const setAuth = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      providerId: string;
      auth: { type: string; key: string };
      directory?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.setAuth(data.providerId, data.auth, data.directory);
  });

export const getEventStreamUrl = createServerFn({ method: "GET" })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }) => {
    let url = "/api/events";
    if (data.directory) {
      url += `?directory=${encodeURIComponent(data.directory)}`;
    }
    return url;
  });

export const exportSession = createServerFn({ method: "GET" })
  .inputValidator((data: { sessionId: string; directory?: string }) => data)
  .handler(async ({ data }) => {
    const session = await httpApi.getSession(data.sessionId, data.directory);
    const messages = await httpApi.getMessages(data.sessionId, data.directory);
    return {
      session,
      messages,
      timestamp: new Date().toISOString(),
    };
  });

export const getLspStatus = createServerFn({ method: "GET" })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }): Promise<LspStatus[]> => {
    return httpApi.getLspStatus(data.directory);
  });

export const getFormatterStatus = createServerFn({ method: "GET" })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }): Promise<FormatterStatus[]> => {
    return httpApi.getFormatterStatus(data.directory);
  });

export const logEvent = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      service: string;
      level: "debug" | "info" | "warn" | "error";
      message: string;
      extra?: Record<string, unknown>;
      directory?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    return httpApi.logEvent(
      {
        service: data.service,
        level: data.level,
        message: data.message,
        extra: data.extra,
      },
      data.directory,
    );
  });

export const getMcpStatus = createServerFn({ method: "GET" })
  .inputValidator((data?: { directory?: string }) => data ?? {})
  .handler(async ({ data }): Promise<McpStatusResponse> => {
    return httpApi.getMcpStatus(data.directory);
  });
