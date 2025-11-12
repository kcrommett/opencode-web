import { getOpencodeServerUrl } from "./opencode-config";
import type {
  Agent,
  Part,
  McpStatusResponse,
  Todo,
  SessionForkRequest,
  SessionForkResponse,
  PermissionResponse,
  SessionDiffResponse,
  TuiEvent,
  TuiControlRequest,
  TuiControlResponse,
  LspStatus,
  FormatterStatus,
  OpencodeConfig,
  ConfigUpdateResponse,
  ConfigErrorPayload,
} from "../types/opencode";

export class OpencodeHttpError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function buildUrl(
  path: string,
  params?: Record<string, string>,
  absolute?: boolean,
): string {
  const fullUrl = absolute
    ? path.startsWith("http")
      ? path
      : `${getOpencodeServerUrl()}${path}`
    : `${getOpencodeServerUrl()}${path}`;
  const url = new URL(fullUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
}

export async function getAgents() {
  const response = await fetch(buildUrl("/agent"));
  if (!response.ok) {
    throw new Error(`Failed to get agents: ${response.statusText}`);
  }
  return response.json();
}

export async function getProviders() {
  const response = await fetch(buildUrl("/config/providers"));
  if (!response.ok) {
    throw new Error(`Failed to get providers: ${response.statusText}`);
  }
  return response.json();
}

export async function getSessions(directory?: string) {
  const url = buildUrl("/session", directory ? { directory } : undefined);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to get sessions: ${response.statusText}`);
  }
  return response.json();
}

export async function getSession(sessionId: string, directory?: string) {
  const response = await fetch(
    buildUrl(`/session/${sessionId}`, directory ? { directory } : undefined),
  );
  if (!response.ok) {
    throw new Error(`Failed to get session: ${response.statusText}`);
  }
  return response.json();
}

export async function createSession(
  body: { title?: string; parentID?: string },
  directory?: string,
) {
  const url = buildUrl("/session", directory ? { directory } : undefined);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteSession(sessionId: string, directory?: string) {
  const response = await fetch(
    buildUrl(`/session/${sessionId}`, directory ? { directory } : undefined),
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to delete session: ${response.statusText}`);
  }
  return response.ok;
}

export async function updateSession(
  sessionId: string,
  updates: { title?: string },
  directory?: string,
) {
  const response = await fetch(
    buildUrl(`/session/${sessionId}`, directory ? { directory } : undefined),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to update session: ${response.statusText}`);
  }
  return response.json();
}

export async function getMessages(sessionId: string, directory?: string) {
  const response = await fetch(
    buildUrl(
      `/session/${sessionId}/message`,
      directory ? { directory } : undefined,
    ),
  );
  if (!response.ok) {
    throw new Error(`Failed to get messages: ${response.statusText}`);
  }
  return response.json();
}

export async function getMessage(
  sessionId: string,
  messageId: string,
  directory?: string,
) {
  const response = await fetch(
    buildUrl(
      `/session/${sessionId}/message/${messageId}`,
      directory ? { directory } : undefined,
    ),
  );
  if (!response.ok) {
    throw new Error(`Failed to get message: ${response.statusText}`);
  }
  return response.json();
}

export async function getSessionTodos(
  sessionId: string,
  directory?: string,
): Promise<Todo[]> {
  const response = await fetch(
    buildUrl(
      `/session/${sessionId}/todo`,
      directory ? { directory } : undefined,
    ),
  );

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Failed to get session todos: ${response.statusText}`);
  }

  try {
    return (await response.json()) as Todo[];
  } catch {
    return [];
  }
}

export async function sendMessage(
  sessionId: string,
  content: string,
  providerID?: string,
  modelID?: string,
  directory?: string,
  agent?: Agent,
  parts?: Part[],
  options?: {
    messageID?: string;
    noReply?: boolean;
    system?: string;
    tools?: Record<string, unknown>;
  },
) {
  const body: Record<string, unknown> = {};
  const providedParts = Array.isArray(parts)
    ? parts.filter((part): part is Part => Boolean(part))
    : [];

  const serializePart = (part: Part): Record<string, unknown> | null => {
    if (!part || typeof part.type !== "string") return null;

    if (part.type === "text") {
      const textValue =
        typeof part.text === "string"
          ? part.text
          : typeof part.content === "string"
            ? part.content
            : "";

      if (textValue.trim().length === 0) {
        return null;
      }

      return {
        type: "text",
        text: textValue,
      };
    }

    if (part.type === "file") {
      const rawContent =
        typeof part.content === "string" && part.content.length > 0
          ? part.content
          : undefined;
      const rawUrl =
        typeof part.url === "string" && part.url.length > 0 ? part.url : undefined;
      const url = rawContent ?? rawUrl;

      if (!url) {
        return null;
      }

      const mime =
        typeof (part as { mimeType?: unknown }).mimeType === "string" &&
        (part as { mimeType?: string }).mimeType
          ? (part as { mimeType?: string }).mimeType
          : typeof (part as { mime?: unknown }).mime === "string" &&
              (part as { mime?: string }).mime
            ? (part as { mime?: string }).mime
            : undefined;

      const filename =
        typeof (part as { name?: unknown }).name === "string" &&
        (part as { name?: string }).name
          ? (part as { name?: string }).name
          : typeof (part as { filename?: unknown }).filename === "string" &&
              (part as { filename?: string }).filename
            ? (part as { filename?: string }).filename
            : typeof part.path === "string" && part.path.length > 0
              ? part.path
              : undefined;

      const filePart: Record<string, unknown> = {
        type: "file",
        mime: mime ?? "application/octet-stream",
        url,
      };

      if (filename) {
        filePart.filename = filename;
      }

      return filePart;
    }

    return null;
  };

  const mappedParts = providedParts
    .map((part) => serializePart(part))
    .filter((part): part is Record<string, unknown> => Boolean(part));

  if (mappedParts.length === 0) {
    if (content.trim().length > 0) {
      mappedParts.push({ type: "text", text: content });
    }
  }

  body.parts = mappedParts.length > 0 ? mappedParts : [{ type: "text", text: content }];
  if (providerID && modelID) {
    body.model = { providerID, modelID };
  }
  if (agent) {
    body.agent = agent.id || agent.name;
  }
  if (options?.messageID) {
    body.messageID = options.messageID;
  }
  if (typeof options?.noReply === "boolean") {
    body.noReply = options.noReply;
  }
  if (typeof options?.system === "string" && options.system.length > 0) {
    body.system = options.system;
  }
  if (options?.tools && typeof options.tools === "object") {
    body.tools = options.tools;
  }

  const url = buildUrl(
    `/session/${sessionId}/message`,
    directory ? { directory } : undefined,
  );

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = response.statusText;

    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.data?.message) {
        errorMessage = errorJson.data.message;
      }
    } catch {
      errorMessage = errorText || response.statusText;
    }

    throw new Error(errorMessage);
  }
  return response.json();
}

export async function abortSession(sessionId: string, directory?: string) {
  const response = await fetch(
    buildUrl(
      `/session/${sessionId}/abort`,
      directory ? { directory } : undefined,
    ),
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to abort session: ${response.statusText}`);
  }
  return response.ok;
}

export async function shareSession(sessionId: string, directory?: string) {
  const response = await fetch(
    buildUrl(
      `/session/${sessionId}/share`,
      directory ? { directory } : undefined,
    ),
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to share session: ${response.statusText}`);
  }
  return response.json();
}

export async function unshareSession(sessionId: string, directory?: string) {
  const response = await fetch(
    buildUrl(
      `/session/${sessionId}/share`,
      directory ? { directory } : undefined,
    ),
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to unshare session: ${response.statusText}`);
  }
  return response.json();
}

export async function forkSession(
  sessionId: string,
  body: SessionForkRequest = {},
  directory?: string,
): Promise<SessionForkResponse> {
  const response = await fetch(
    buildUrl(
      `/session/${sessionId}/fork`,
      directory ? { directory } : undefined,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      errorText || response.statusText || "Failed to fork session",
    );
  }

  return response.json();
}

export async function revertMessage(
  sessionId: string,
  messageID: string,
  directory?: string,
  partID?: string,
) {
  const payload: Record<string, string> = { messageID };
  if (partID) {
    payload.partID = partID;
  }

  const response = await fetch(
    buildUrl(
      `/session/${sessionId}/revert`,
      directory ? { directory } : undefined,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to revert message: ${response.statusText}`);
  }
  return response.ok;
}

export async function unrevertSession(sessionId: string, directory?: string) {
  const response = await fetch(
    buildUrl(
      `/session/${sessionId}/unrevert`,
      directory ? { directory } : undefined,
    ),
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to unrevert session: ${response.statusText}`);
  }
  return response.ok;
}

export async function runCommand(
  sessionId: string,
  command: string,
  args?: string[],
  directory?: string,
  agent?: string,
  options?: {
    arguments?: unknown;
    messageID?: string;
  },
) {
  const body: Record<string, unknown> = { command };

  if (Array.isArray(args)) {
    body.args = args;
  }

  if (agent) {
    body.agent = agent;
  }

  if (options?.arguments !== undefined) {
    body.arguments = options.arguments;
  }

  if (options?.messageID) {
    body.messageID = options.messageID;
  }

  const response = await fetch(
    buildUrl(
      `/session/${sessionId}/shell`,
      directory ? { directory } : undefined,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const responseText = await response.text();
      if (responseText) {
        try {
          const parsed = JSON.parse(responseText);
          errorMessage =
            parsed?.error ||
            parsed?.message ||
            parsed?.data?.message ||
            parsed;
        } catch {
          errorMessage = responseText;
        }
      }
    } catch {
      // Ignore secondary errors and fall back to status text
    }

    if (typeof errorMessage === "object") {
      try {
        errorMessage = JSON.stringify(errorMessage);
      } catch {
        errorMessage = "[object Object]";
      }
    }

    throw new Error(`Failed to run command: ${errorMessage}`);
  }
  return response.json();
}

export async function findFiles(
  query: string,
  directory?: string,
  includeDirectories?: boolean,
) {
  const params: Record<string, string> = { query };
  if (directory) params.directory = directory;
  if (typeof includeDirectories === "boolean") {
    params.dirs = String(includeDirectories);
  }
  const response = await fetch(buildUrl("/find/file", params));
  if (!response.ok) {
    throw new Error(`Failed to find files: ${response.statusText}`);
  }
  return response.json();
}

export async function findInFiles(pattern: string, directory?: string) {
  const params: Record<string, string> = { pattern };
  if (directory) params.directory = directory;
  const response = await fetch(buildUrl("/find", params));
  if (!response.ok) {
    throw new Error(`Failed to find in files: ${response.statusText}`);
  }
  return response.json();
}

export async function findSymbols(query: string, directory?: string) {
  const params: Record<string, string> = { query };
  if (directory) params.directory = directory;
  const response = await fetch(buildUrl("/find/symbol", params));
  if (!response.ok) {
    throw new Error(`Failed to find symbols: ${response.statusText}`);
  }
  return response.json();
}

export async function readFile(filePath: string, directory?: string) {
  const params: Record<string, string> = { path: filePath };
  if (directory) params.directory = directory;
  const url = buildUrl("/file/content", params);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to read file: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

export async function getFileStatus(directory?: string) {
  const params = directory ? { directory } : undefined;
  const response = await fetch(buildUrl("/file/status", params));
  if (!response.ok) {
    throw new Error(`Failed to get file status: ${response.statusText}`);
  }
  return response.json();
}

export async function getFileDiff(
  sessionId: string,
  options?: { directory?: string; messageID?: string },
): Promise<SessionDiffResponse> {
  const params: Record<string, string> = {};
  if (options?.directory) {
    params.directory = options.directory;
  }
  if (options?.messageID) {
    params.messageID = options.messageID;
  }

  const response = await fetch(buildUrl(`/session/${sessionId}/diff`, params));

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    const errorPayload = await response.text().catch(() => "");
    const reason = errorPayload || response.statusText || "Unknown diff error";
    throw new Error(`Failed to fetch session diff: ${reason}`);
  }

  try {
    const payload = (await response.json()) as SessionDiffResponse;
    return Array.isArray(payload) ? payload : [];
  } catch {
    return [];
  }
}

export async function respondToPermission(
  sessionId: string,
  permissionId: string,
  permissionResponse: PermissionResponse,
  directory?: string,
) {
  const response = await fetch(
    buildUrl(
      `/session/${sessionId}/permissions/${permissionId}`,
      directory ? { directory } : undefined,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: permissionResponse }),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to respond to permission: ${response.statusText}`);
  }
  return response.ok;
}

export async function getConfig(options?: {
  scope?: "global" | "project";
  directory?: string;
}) {
  const params: Record<string, string> = {};
  if (options?.scope) {
    params.scope = options.scope;
  }
  if (options?.directory && options.scope !== "global") {
    params.directory = options.directory;
  }

  const url = Object.keys(params).length > 0
    ? buildUrl("/config", params)
    : buildUrl("/config");

  const response = await fetch(url);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      (errorBody && typeof errorBody === "object" && "message" in errorBody
        ? (errorBody as Record<string, unknown>).message
        : null) ||
      `Failed to get config: ${response.statusText}`;
    throw new OpencodeHttpError(message as string, response.status, errorBody);
  }
  return response.json();
}

export async function getSessionChildren(
  sessionId: string,
  directory?: string,
) {
  const response = await fetch(
    buildUrl(
      `/session/${sessionId}/children`,
      directory ? { directory } : undefined,
    ),
  );
  if (!response.ok) {
    throw new Error(`Failed to get session children: ${response.statusText}`);
  }
  return response.json();
}

export async function initSession(
  sessionId: string,
  messageID: string,
  providerID: string,
  modelID: string,
  directory?: string,
) {
  const response = await fetch(
    buildUrl(
      `/session/${sessionId}/init`,
      directory ? { directory } : undefined,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageID, providerID, modelID }),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to init session: ${response.statusText}`);
  }
  return response.ok;
}

export async function summarizeSession(
  sessionId: string,
  providerID: string,
  modelID: string,
  directory?: string,
) {
  const response = await fetch(
    buildUrl(
      `/session/${sessionId}/summarize`,
      directory ? { directory } : undefined,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerID, modelID }),
    },
  );
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorBody = await response.text();
      if (errorBody) {
        errorMessage = errorBody;
      }
    } catch {
      // Ignore parsing errors, use statusText
    }
    throw new Error(`Failed to summarize session: ${errorMessage}`);
  }
  return response.ok;
}

async function postTuiEndpoint(
  path: string,
  options?: { directory?: string; body?: Record<string, unknown> },
) {
  const response = await fetch(
    buildUrl(path, options?.directory ? { directory: options.directory } : undefined),
    {
      method: "POST",
      headers: options?.body ? { "Content-Type": "application/json" } : undefined,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to call ${path}: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => true);
  }
  return true;
}

export async function appendPrompt(text: string) {
  const response = await fetch(buildUrl("/tui/append-prompt"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    throw new Error(`Failed to append prompt: ${response.statusText}`);
  }
  return response.json();
}

export async function submitPrompt() {
  const response = await fetch(buildUrl("/tui/submit-prompt"), {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to submit prompt: ${response.statusText}`);
  }
  return response.json();
}

export async function clearPrompt() {
  const response = await fetch(buildUrl("/tui/clear-prompt"), {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to clear prompt: ${response.statusText}`);
  }
  return response.json();
}

export async function executeCommand(command: string) {
  const response = await fetch(buildUrl("/tui/execute-command"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  });
  if (!response.ok) {
    throw new Error(`Failed to execute command: ${response.statusText}`);
  }
  return response.json();
}

export async function showToast(
  message: string,
  title?: string,
  variant?: "success" | "error" | "warning" | "info",
) {
  try {
    const response = await fetch(buildUrl("/tui/show-toast"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message, variant }),
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
      };
    }

    const data = await response.json().catch(() => ({}));

    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown toast error",
    };
  }
}

export async function openTuiHelp(directory?: string) {
  return postTuiEndpoint("/tui/open-help", { directory });
}

export async function openTuiSessions(directory?: string) {
  return postTuiEndpoint("/tui/open-sessions", { directory });
}

export async function openTuiThemes(directory?: string) {
  return postTuiEndpoint("/tui/open-themes", { directory });
}

export async function openTuiModels(directory?: string) {
  return postTuiEndpoint("/tui/open-models", { directory });
}

export async function publishTuiEvent(
  event: TuiEvent,
  directory?: string,
) {
  return postTuiEndpoint("/tui/publish", { directory, body: event });
}

export async function getNextTuiControlRequest(
  directory?: string,
): Promise<TuiControlRequest | null> {
  const response = await fetch(
    buildUrl(
      "/tui/control/next",
      directory ? { directory } : undefined,
    ),
  );

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch next TUI control request: ${response.statusText}`);
  }

  try {
    return (await response.json()) as TuiControlRequest;
  } catch {
    return null;
  }
}

export async function respondToTuiControl(
  payload: TuiControlResponse,
  directory?: string,
) {
  const response = await fetch(
    buildUrl(
      "/tui/control/response",
      directory ? { directory } : undefined,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to respond to TUI control: ${response.statusText}`);
  }

  return response.json().catch(() => true);
}

export async function listProjects(directory?: string) {
  const url = buildUrl("/project", directory ? { directory } : undefined);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to list projects: ${response.statusText}`);
  }
  return response.json();
}

export async function getCurrentProject(directory?: string) {
  const url = buildUrl(
    "/project/current",
    directory ? { directory } : undefined,
  );
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to get current project: ${response.statusText}`);
  }
  return response.json();
}

export async function getCurrentPath(directory?: string) {
  const url = buildUrl("/path", directory ? { directory } : undefined);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to get current path: ${response.statusText}`);
  }
  return response.json();
}

export async function listFiles(path: string, directory?: string) {
  const params: Record<string, string> = { path };
  if (directory) params.directory = directory;
  const response = await fetch(buildUrl("/file", params));
  if (!response.ok) {
    throw new Error(`Failed to list files: ${response.statusText}`);
  }
  return response.json();
}

export async function getToolIds(directory?: string) {
  const url = buildUrl(
    "/experimental/tool/ids",
    directory ? { directory } : undefined,
  );
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to get tool IDs: ${response.statusText}`);
  }
  return response.json();
}

export async function getTools(
  provider: string,
  model: string,
  directory?: string,
) {
  const params: Record<string, string> = { provider, model };
  if (directory) params.directory = directory;
  const response = await fetch(buildUrl("/experimental/tool", params));
  if (!response.ok) {
    throw new Error(`Failed to get tools: ${response.statusText}`);
  }
  return response.json();
}

export async function getCommands(directory?: string) {
  const url = buildUrl("/command", directory ? { directory } : undefined);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to get commands: ${response.statusText}`);
  }
  return response.json();
}

export async function updateConfig(
  config: Record<string, unknown>,
  options?: { scope?: "global" | "project"; directory?: string },
): Promise<ConfigUpdateResponse> {
  const params: Record<string, string> = {};
  if (options?.scope) {
    params.scope = options.scope;
  }
  if (options?.directory && options?.scope !== "global") {
    params.directory = options.directory;
  }

  const url = Object.keys(params).length > 0 
    ? buildUrl("/config", params)
    : buildUrl("/config");

  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const errorBody = (await response
      .json()
      .catch(() => ({}))) as ConfigErrorPayload | Record<string, unknown>;
    const message =
      (errorBody && typeof errorBody === "object" && "message" in errorBody
        ? (errorBody as Record<string, unknown>).message
        : null) ||
      `Failed to update config: ${response.statusText}`;

    throw new OpencodeHttpError(
      message as string,
      response.status,
      errorBody,
    );
  }

  return response.json() as Promise<ConfigUpdateResponse>;
}

export async function setAuth(
  providerId: string,
  auth: { type: string; key: string },
  directory?: string,
) {
  const url = buildUrl(
    `/auth/${providerId}`,
    directory ? { directory } : undefined,
  );
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(auth),
  });
  if (!response.ok) {
    throw new Error(`Failed to set auth: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get MCP (Model Context Protocol) server status
 * @returns MCP server status including connection states
 */
export async function getMcpStatus(
  directory?: string,
): Promise<McpStatusResponse> {
  const response = await fetch(
    buildUrl("/mcp", directory ? { directory } : undefined),
  );
  if (!response.ok) {
    throw new Error(`Failed to get MCP status: ${response.statusText}`);
  }
  return response.json();
}

export async function getLspStatus(directory?: string): Promise<LspStatus[]> {
  const response = await fetch(
    buildUrl("/lsp", directory ? { directory } : undefined),
  );
  if (!response.ok) {
    throw new Error(`Failed to get LSP status: ${response.statusText}`);
  }
  return response.json();
}

export async function getFormatterStatus(
  directory?: string,
): Promise<FormatterStatus[]> {
  const response = await fetch(
    buildUrl("/formatter", directory ? { directory } : undefined),
  );
  if (!response.ok) {
    throw new Error(`Failed to get formatter status: ${response.statusText}`);
  }
  return response.json();
}

export async function logEvent(
  entry: { service: string; level: "debug" | "info" | "warn" | "error"; message: string; extra?: Record<string, unknown> },
  directory?: string,
) {
  const response = await fetch(
    buildUrl("/log", directory ? { directory } : undefined),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to send log entry: ${response.statusText}`);
  }

  return response.json().catch(() => true);
}
