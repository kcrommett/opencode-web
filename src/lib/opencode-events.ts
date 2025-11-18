import type { Part, ConfigUpdatedEventPayload } from "@/types/opencode";

/**
 * OpenCode Server-Sent Events types and client
 */

const isDevMode = process.env.NODE_ENV !== "production";

const devLog = (...args: unknown[]) => {
  if (isDevMode) console.log(...args);
};

const devError = (...args: unknown[]) => {
  if (isDevMode) console.error(...args);
};

const devWarn = (...args: unknown[]) => {
  if (isDevMode) console.warn(...args);
};

/**
 * Error envelope returned by SSE proxy when upstream returns non-SSE content
 */
export interface SseProxyError {
  status: number;
  upstreamUrl: string;
  contentType: string | null;
  bodySnippet: string;
  timestamp: string;
}

interface ServerConnectedEvent {
  type: "server.connected";
  properties: Record<string, unknown>;
}

interface InstallationUpdatedEvent {
  type: "installation.updated";
  properties: {
    version: string;
  };
}

interface IdeInstalledEvent {
  type: "ide.installed";
  properties: {
    ide: string;
  };
}

interface SessionUpdatedEvent {
  type: "session.updated";
  properties: {
    info?: {
      id: string;
      title?: string;
      [key: string]: unknown;
    };
  };
}

interface SessionDeletedEvent {
  type: "session.deleted";
  properties: {
    info?: {
      id: string;
      [key: string]: unknown;
    };
  };
}

interface SessionCompactedEvent {
  type: "session.compacted";
  properties: {
    sessionID: string;
  };
}

interface SessionIdleEvent {
  type: "session.idle";
  properties: {
    sessionID: string;
  };
}

interface SessionErrorEvent {
  type: "session.error";
  properties: {
    error?: {
      type: string;
      message: string;
      [key: string]: unknown;
    };
    sessionID?: string;
  };
}

interface MessageUpdatedEvent {
  type: "message.updated";
  properties: {
    info?: {
      id: string;
      role: "user" | "assistant";
      time: {
        created: number;
        modified?: number;
      };
      reverted?: boolean;
      tokens?: {
        input: number;
        output: number;
        reasoning: number;
        cache?: {
          read: number;
          write: number;
        };
      };
      cost?: number;
      modelID?: string;
      mode?: string;
      [key: string]: unknown;
    };
  };
}

interface MessageRemovedEvent {
  type: "message.removed";
  properties: {
    messageID: string;
    sessionID: string;
  };
}

interface MessagePartUpdatedEvent {
  type: "message.part.updated";
  properties: {
    sessionID?: string;
    messageID?: string;
    part?: Part & { messageID?: string };
  };
}

interface MessagePartRemovedEvent {
  type: "message.part.removed";
  properties: {
    messageID: string;
    partID: string;
    sessionID: string;
  };
}

interface PermissionUpdatedEvent {
  type: "permission.updated";
  properties: {
    id: string;
    sessionID: string;
    message?: string;
    details?: unknown;
    [key: string]: unknown;
  };
}

interface PermissionRepliedEvent {
  type: "permission.replied";
  properties: {
    permissionID: string;
    response: string;
    sessionID: string;
  };
}

interface FileEditedEvent {
  type: "file.edited";
  properties: {
    file: string;
  };
}

interface FileWatcherUpdatedEvent {
  type: "file.watcher.updated";
  properties: {
    file: string;
    event: "add" | "change" | "unlink";
  };
}

interface TodoUpdatedEvent {
  type: "todo.updated";
  properties: {
    sessionID: string;
    todos?: Array<{
      content: string;
      status: "pending" | "in_progress" | "completed" | "cancelled";
      priority: "high" | "medium" | "low";
      id: string;
    }>;
  };
}

interface LSPDiagnosticsEvent {
  type: "lsp.client.diagnostics";
  properties: {
    path: string;
    serverID: string;
  };
}

interface ConfigUpdatedEvent {
  type: "config.updated";
  properties: ConfigUpdatedEventPayload;
}

export type OpencodeEvent =
  | ServerConnectedEvent
  | InstallationUpdatedEvent
  | IdeInstalledEvent
  | SessionUpdatedEvent
  | SessionDeletedEvent
  | SessionCompactedEvent
  | SessionIdleEvent
  | SessionErrorEvent
  | MessageUpdatedEvent
  | MessageRemovedEvent
  | MessagePartUpdatedEvent
  | MessagePartRemovedEvent
  | PermissionUpdatedEvent
  | PermissionRepliedEvent
  | FileEditedEvent
  | FileWatcherUpdatedEvent
  | TodoUpdatedEvent
  | LSPDiagnosticsEvent
  | ConfigUpdatedEvent;

export interface SSEConnectionState {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
  lastEventId?: string;
}

interface SSEClientOptions {
  url: string;
  onEvent: (event: OpencodeEvent) => void;
  onError?: (error: Error) => void;
  onProxyError?: (error: SseProxyError) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  withCredentials?: boolean;
}

export class OpencodeSSEClient {
  private eventSource: EventSource | null = null;
  private options: SSEClientOptions;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private state: SSEConnectionState = {
    connected: false,
    reconnecting: false,
    error: null,
    reconnectAttempts: 0,
  };

  constructor(options: SSEClientOptions) {
    this.options = {
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      withCredentials: false,
      ...options,
    };
  }

  get connectionState(): SSEConnectionState {
    return this.state;
  }

  connect(): void {
    if (this.eventSource) {
      return;
    }

    // Directly create EventSource - don't pre-check
    this.createEventSource();
  }

  private async checkForProxyError(): Promise<boolean> {
    const abortController = new AbortController();
    try {
      // Only called when EventSource errors - check if it's a JSON error envelope
      const response = await fetch(this.options.url, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
        },
        signal: abortController.signal,
      });

      const contentType = response.headers.get("content-type");
      
      // If server returns JSON, it's an error envelope
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        if (data.error && typeof data.error === "object") {
          const proxyError = data.error as SseProxyError;
          devError("[SSE] Proxy returned error:", proxyError);
          
          this.state = {
            ...this.state,
            connected: false,
            error: `Upstream error: ${proxyError.status} - ${proxyError.contentType || "unknown"}`,
          };

          this.options.onProxyError?.(proxyError);
          
          // Don't retry for proxy errors - they indicate configuration issues
          this.options.onDisconnect?.();
          return true;
        }
      }

      // Response is not a JSON error - abort the probe to avoid ghost connection
      abortController.abort();
      return false;
    } catch {
      // Abort the connection if still active
      abortController.abort();
      // Network error - let EventSource handle it
      return false;
    }
  }

  private createEventSource(): void {
    try {
      this.eventSource = new EventSource(this.options.url, {
        withCredentials: this.options.withCredentials,
      });

      this.eventSource.onopen = () => {
        devLog("[SSE] Connection opened");
        this.state = {
          connected: true,
          reconnecting: false,
          error: null,
          reconnectAttempts: 0,
        };
        this.reconnectAttempts = 0;
        this.options.onConnect?.();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          devLog("[SSE] Received event:", data.type, data);
          this.options.onEvent(data);
        } catch (error) {
          devError("[SSE] Failed to parse event data:", error);
        }
      };

      this.eventSource.onerror = (error) => {
        devError("[SSE] Connection error:", error);
        this.state = {
          ...this.state,
          connected: false,
          error: "Connection failed",
        };

        this.options.onError?.(new Error("SSE connection failed"));
        
        // Check if this is a proxy error (JSON response instead of SSE)
        // This only happens on error, not on every successful connection
        this.checkForProxyError();
        
        this.handleReconnection();
      };
    } catch (error) {
      devError("[SSE] Failed to create EventSource:", error);
      this.options.onError?.(error as Error);
      this.handleReconnection();
    }
  }

  private handleReconnection(): void {
    if (this.reconnectTimer) {
      return;
    }

    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts || 5)) {
      devWarn("[SSE] Max reconnection attempts reached");
      this.state = {
        ...this.state,
        reconnecting: false,
        error: "Max reconnection attempts reached",
      };
      this.options.onDisconnect?.();
      return;
    }

    this.reconnectAttempts++;
    this.state = {
      ...this.state,
      reconnecting: true,
      reconnectAttempts: this.reconnectAttempts,
    };

    const delay =
      (this.options.reconnectDelay || 1000) *
      Math.pow(2, this.reconnectAttempts - 1);
    devLog(
      `[SSE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.disconnect();
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.state = {
      ...this.state,
      connected: false,
      reconnecting: false,
    };

    this.options.onDisconnect?.();
  }

  reconnect(): void {
    devLog("[SSE] Manual reconnect requested");
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
}
