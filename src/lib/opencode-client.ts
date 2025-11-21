import * as serverFns from "./opencode-server-fns";
import {
  OpencodeSSEClient,
  OpencodeEvent,
  SSEConnectionState,
  SseProxyError,
} from "./opencode-events";
import type {
  Agent,
  Part,
  McpStatusResponse,
  McpServerStatus,
  Todo,
  PermissionResponse,
  SessionDiffResponse,
  SessionForkResponse,
  TuiEvent,
  TuiControlRequest,
  TuiControlResponse,
  LspStatus,
  FormatterStatus,
  ConfigUpdateResponse,
} from "../types/opencode";

const isDevMode = process.env.NODE_ENV !== "production";
const devLog = (...args: unknown[]) => {
  if (isDevMode) console.log(...args);
};
const devError = (...args: unknown[]) => {
  if (isDevMode) console.error(...args);
};

type LogLevel = "info" | "error" | "debug" | "warn";

interface SendMessageOptions {
  providerID?: string;
  modelID?: string;
  directory?: string;
  agent?: Agent;
  parts?: Part[];
  messageID?: string;
  noReply?: boolean;
  system?: string;
  tools?: Record<string, unknown>;
}

interface RunCommandOptions {
  args?: string[];
  directory?: string;
  agent?: string;
  arguments?: unknown;
  messageID?: string;
}

const isMcpStatus = (value: unknown): value is McpServerStatus =>
  value === "connected" || value === "failed";

const extractMcpStatus = (value: unknown): McpServerStatus | null => {
  if (isMcpStatus(value)) return value;
  if (value && typeof value === "object") {
    const status = (value as { status?: unknown }).status;
    if (isMcpStatus(status)) return status;
  }
  return null;
};

const normalizeMcpStatusResponse = (
  input: unknown,
): McpStatusResponse | null => {
  if (!input || typeof input !== "object") return null;
  const normalized: Record<string, McpServerStatus> = {};
  for (const [name, value] of Object.entries(
    input as Record<string, unknown>,
  )) {
    const status = extractMcpStatus(value);
    if (status) normalized[name] = status;
  }
  if (Object.keys(normalized).length === 0) return null;
  return normalized;
};

// SSE client and event handlers
let sseClient: OpencodeSSEClient | null = null;
let eventHandlers: Array<(event: OpencodeEvent) => void> = [];

export const openCodeService = {
  async getAgents() {
    try {
      const response = await serverFns.getAgents();
      return { data: response, error: null };
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) };
    }
  },

  async log(
    message: string,
    {
      level = "info",
      service = "opencode-web",
      extra,
      directory,
    }: {
      level?: LogLevel;
      service?: string;
      extra?: Record<string, unknown>;
      directory?: string;
    } = {},
  ) {
    if (isDevMode) {
      console.log(`[${level.toUpperCase()}][${service}] ${message}`, extra ?? "");
    }

    try {
      const response = await serverFns.logEvent({
        data: { service, level, message, extra, directory },
      });
      return { data: response, error: null };
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) };
    }
  },

  async listProjects(directory?: string) {
    try {
      const response = await serverFns.listProjects({ data: { directory } });
      return { data: response, error: null };
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) };
    }
  },

  async getCurrentProject(directory?: string) {
    try {
      const response = await serverFns.getCurrentProject({
        data: { directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getCurrentPath() {
    try {
      const response = await serverFns.getCurrentPath({ data: {} });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getConfig(options?: {
    directory?: string;
    scope?: "global" | "project";
  }) {
    try {
      const data: { directory?: string; scope?: "global" | "project" } = {};
      if (options?.directory) {
        data.directory = options.directory;
      }
      if (options?.scope) {
        data.scope = options.scope;
      }

      const response = await serverFns.getConfig({ data });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getProviders() {
    try {
      const response = await serverFns.getProviders();
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async createSession({
    title,
    directory,
  }: { title?: string; directory?: string } = {}) {
    try {
      const response = await serverFns.createSession({
        data: { title, directory },
      });
      return { data: response, error: null };
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) };
    }
  },

  async sendMessage(
    sessionId: string,
    content: string,
    options: SendMessageOptions = {},
  ) {
    const {
      providerID = "anthropic",
      modelID = "claude-3-5-sonnet-20241022",
      directory,
      agent,
      parts,
      messageID,
      noReply,
      system,
      tools,
    } = options;

    try {
      const response = await serverFns.sendMessage({
        data: {
          sessionId,
          content,
          providerID,
          modelID,
          directory,
          agent,
          parts,
          messageID,
          noReply,
          system,
          tools,
        },
      });
      return { data: response, error: null };
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) };
    }
  },

  async getMessages(sessionId: string, directory?: string) {
    const response = await serverFns.getMessages({
      data: { sessionId, directory },
    });
    return { data: response };
  },

  async getSessionTodos(sessionId: string, directory?: string) {
    try {
      const response = await serverFns.getSessionTodos({
        data: { sessionId, directory },
      });
      return { data: response as Todo[], error: null };
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) };
    }
  },

  async getSessions(directory?: string) {
    try {
      const response = await serverFns.getSessions({ data: { directory } });
      return { data: response };
    } catch (error) {
      devError("Error in getSessions:", error);
      return { data: [] };
    }
  },

  async getSession(sessionId: string, directory?: string) {
    try {
      const response = await serverFns.getSession({
        data: { sessionId, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async updateSession(
    sessionId: string,
    updates: { title?: string },
    directory?: string,
  ) {
    try {
      const response = await serverFns.updateSession({
        data: { sessionId, title: updates.title, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async deleteSession(sessionId: string, directory?: string) {
    try {
      const response = await serverFns.deleteSession({
        data: { sessionId, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async deleteAllSessions() {
    try {
      return { data: true };
    } catch (error) {
      throw error;
    }
  },

  async initSession(
    sessionId: string,
    messageID: string,
    providerID: string,
    modelID: string,
    directory?: string,
  ) {
    try {
      const response = await serverFns.initSession({
        data: { sessionId, messageID, providerID, modelID, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async abortSession(sessionId: string, directory?: string) {
    try {
      const response = await serverFns.abortSession({
        data: { sessionId, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async shareSession(sessionId: string, directory?: string) {
    try {
      const response = await serverFns.shareSession({
        data: { sessionId, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async unshareSession(sessionId: string, directory?: string) {
    try {
      const response = await serverFns.unshareSession({
        data: { sessionId, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async forkSession(
    sessionId: string,
    options: { messageID?: string; title?: string } = {},
    directory?: string,
  ) {
    try {
      const response = await serverFns.forkSession({
        data: {
          sessionId,
          messageID: options.messageID,
          title: options.title,
          directory,
        },
      });
      return { data: response, error: null };
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) };
    }
  },

  async summarizeSession(
    sessionId: string,
    providerID: string,
    modelID: string,
    directory?: string,
  ) {
    try {
      const response = await serverFns.summarizeSession({
        data: { sessionId, providerID, modelID, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getSessionMessage(
    sessionId: string,
    messageID: string,
    directory?: string,
  ) {
    try {
      const response = await serverFns.getMessage({
        data: { sessionId, messageId: messageID, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async sendCommand(
    sessionId: string,
    command: string,
    options: RunCommandOptions = {},
  ) {
    const { args, directory, agent, arguments: structuredArgs, messageID } =
      options;

    try {
      const response = await serverFns.runCommand({
        data: {
          sessionId,
          command,
          args,
          directory,
          agent,
          arguments: structuredArgs,
          messageID,
        },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async runShell(
    sessionId: string,
    command: string,
    options: RunCommandOptions = {},
  ) {
    const { args, directory, agent, arguments: structuredArgs, messageID } =
      options;
    try {
      const response = await serverFns.runCommand({
        data: {
          sessionId,
          command,
          args,
          directory,
          agent,
          arguments: structuredArgs,
          messageID,
        },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async revertMessage(
    sessionId: string,
    messageID: string,
    directory?: string,
    partID?: string,
  ) {
    try {
      const response = await serverFns.revertMessage({
        data: { sessionId, messageID, directory, partID },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async unrevertMessage(sessionId: string, directory?: string) {
    try {
      const response = await serverFns.unrevertSession({
        data: { sessionId, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async searchText(pattern: string, directory?: string) {
    try {
      const response = await serverFns.findInFiles({
        data: { pattern, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async findFiles(query: string, directory?: string, dirs?: boolean) {
    try {
      const response = await serverFns.findFiles({
        data: { query, directory, dirs },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async findSymbols(query: string, directory?: string) {
    try {
      const response = await serverFns.findSymbols({
        data: { query, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async listFiles(path: string, directory?: string) {
    try {
      const response = await serverFns.listFiles({ data: { path, directory } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async readFile(filePath: string, directory?: string) {
    try {
      const response = await serverFns.readFile({
        data: { filePath, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getFileStatus(directory?: string) {
    try {
      const response = await serverFns.getFileStatus({
        data: directory ? { directory } : {},
      });
      return { data: response };
    } catch (error) {
      // The /file/status endpoint is broken in some OpenCode server versions
      // Return empty array instead of throwing to prevent app crashes
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[OpenCode Client] /file/status endpoint failed (this is non-critical):', error);
      }
      return { data: [] };
    }
  },

  async getSessionDiff(
    sessionId: string,
    options: { directory?: string; messageID?: string } = {},
  ) {
    try {
      const response = await serverFns.getSessionDiff({
        data: {
          sessionId,
          directory: options.directory,
          messageID: options.messageID,
        },
      });
      return { data: response as SessionDiffResponse, error: null };
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) };
    }
  },

  async appendPrompt(text: string) {
    try {
      const response = await serverFns.appendPrompt({ data: { text } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async openHelp(directory?: string) {
    try {
      const response = await serverFns.openTuiHelp({
        data: directory ? { directory } : {},
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async openSessions(directory?: string) {
    try {
      const response = await serverFns.openTuiSessions({
        data: directory ? { directory } : {},
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async openThemes(directory?: string) {
    try {
      const response = await serverFns.openTuiThemes({
        data: directory ? { directory } : {},
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async openModels(directory?: string) {
    try {
      const response = await serverFns.openTuiModels({
        data: directory ? { directory } : {},
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async publishTuiEvent(event: TuiEvent, directory?: string) {
    try {
      const response = await serverFns.publishTuiEvent({
        data: { event, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getNextTuiControlRequest(directory?: string) {
    try {
      const response = await serverFns.getNextTuiControlRequest({
        data: directory ? { directory } : {},
      });
      return { data: response as TuiControlRequest | null };
    } catch (error) {
      throw error;
    }
  },

  async respondToTuiControl(
    tuiResponse: TuiControlResponse,
    directory?: string,
  ) {
    try {
      const response = await serverFns.respondToTuiControl({
        data: { response: tuiResponse, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async submitPrompt() {
    try {
      const response = await serverFns.submitPrompt();
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async clearPrompt() {
    try {
      const response = await serverFns.clearPrompt();
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async executeCommand(command: string) {
    try {
      const response = await serverFns.executeCommand({ data: { command } });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async showToast(
    message: string,
    title?: string,
    variant: "success" | "error" | "warning" | "info" = "info",
  ) {
    try {
      const response = await serverFns.showToast({
        data: { message, title, variant },
      });
      if (
        response &&
        typeof response === "object" &&
        "ok" in response &&
        response.ok === false
      ) {
        const statusText =
          "statusText" in response ? response.statusText : undefined;
        const status = "status" in response ? response.status : undefined;
        return {
          data: null,
          error: statusText
            ? `Toast not shown (${status ?? ""} ${statusText})`.trim()
            : "Toast not shown",
        };
      }
      return { data: response, error: null };
    } catch (error) {
      devError("[Toast] Failed to show toast via server:", error);
      return { data: null, error: handleOpencodeError(error) };
    }
  },

  async setAuth(providerId: string, type: "api", key: string) {
    try {
      const response = await serverFns.setAuth({
        data: { providerId, auth: { type, key } },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async subscribeToEvents(
    sessionId: string,
    onMessage: (event: OpencodeEvent) => void,
    directory?: string,
    onProxyError?: (error: SseProxyError) => void,
  ) {
    try {
      if (sseClient) {
        sseClient.disconnect();
      }

      // Add the event handler
      eventHandlers = [onMessage];

      const eventStreamUrl = await serverFns.getEventStreamUrl({
        data: { directory },
      });

      sseClient = new OpencodeSSEClient({
        url: eventStreamUrl,
        onEvent: (event: OpencodeEvent) => {
          // Debug logging (skip noisy diagnostics)
          if (event.type !== "lsp.client.diagnostics") {
            devLog("[SSE Event]", event.type, event.properties);
          }

          // Pass all events to handlers - let the handlers decide what to do
          eventHandlers.forEach((handler) => handler(event));
        },
        onConnect: () => {
          devLog("[SSE] Connected to event stream");
        },
        onDisconnect: () => {
          devLog("[SSE] Disconnected from event stream");
        },
        onError: (error: Error) => {
          devError("[SSE] Connection error:", error);
        },
        onProxyError: (error: SseProxyError) => {
          devError("[SSE] Proxy error:", error);
          onProxyError?.(error);
        },
      });

      sseClient.connect();
      return { data: sseClient.connectionState, error: null };
    } catch (error) {
      return { data: null, error: handleOpencodeError(error) };
    }
  },

  unsubscribeFromEvents() {
    if (sseClient) {
      sseClient.disconnect();
      sseClient = null;
    }
    eventHandlers = [];
  },

  getConnectionState(): SSEConnectionState | null {
    return sseClient?.connectionState || null;
  },

  reconnectEvents() {
    if (sseClient) {
      sseClient.reconnect();
    }
  },

  async getToolIds() {
    try {
      const response = await serverFns.getToolIds({ data: {} });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getTools(provider: string, model: string, directory?: string) {
    try {
      const response = await serverFns.getTools({
        data: { provider, model, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getSessionChildren(sessionId: string, directory?: string) {
    try {
      const response = await serverFns.getSessionChildren({
        data: { sessionId, directory },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async respondToPermission(
    sessionId: string,
    permissionId: string,
    permissionResponse: PermissionResponse,
    directory?: string,
  ) {
    try {
      const response = await serverFns.respondToPermission({
        data: {
          sessionId,
          permissionId,
          response: permissionResponse,
          directory,
        },
      });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getCommands() {
    try {
      const response = await serverFns.getCommands({ data: {} });
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async updateConfig(
    config: Record<string, unknown>,
    options?: { directory?: string; scope?: "global" | "project" },
  ): Promise<{ data: ConfigUpdateResponse }> {
    try {
      if (options?.scope === "project" && !options.directory) {
        throw new Error(
          "Project directory is required for project-scoped config updates",
        );
      }
      const sanitizedDirectory =
        options?.scope === "project" ? options?.directory : undefined;
      const response = (await serverFns.updateConfig({
        data: {
          config,
          directory: sanitizedDirectory,
          scope: options?.scope,
        },
      })) as ConfigUpdateResponse;
      return { data: response };
    } catch (error) {
      throw error;
    }
  },

  async getMcpStatus(): Promise<{ data: McpStatusResponse | null }> {
    try {
      const response = await serverFns.getMcpStatus();
      devLog("[OpenCodeService] MCP status (raw):", response);
      const normalized = normalizeMcpStatusResponse(response);
      devLog("[OpenCodeService] MCP status (normalized):", normalized);
      return { data: normalized };
    } catch (error) {
      devError("Error in getMcpStatus:", error);
      throw error;
    }
  },

  async getLspStatus(directory?: string) {
    try {
      const response = await serverFns.getLspStatus({
        data: directory ? { directory } : {},
      });
      return { data: response as LspStatus[] };
    } catch (error) {
      throw error;
    }
  },

  async getFormatterStatus(directory?: string) {
    try {
      const response = await serverFns.getFormatterStatus({
        data: directory ? { directory } : {},
      });
      return { data: response as FormatterStatus[] };
    } catch (error) {
      throw error;
    }
  },
};

export function handleOpencodeError(error: unknown): string {
  if (error && typeof error === "object" && "status" in error) {
    const apiError = error as { status: number; message?: string };
    return `API Error (${apiError.status}): ${apiError.message || "Unknown error"}`;
  }
  if (error && typeof error === "object" && "message" in error) {
    return (error as { message: string }).message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return `Unknown error occurred: ${JSON.stringify(error)}`;
}
