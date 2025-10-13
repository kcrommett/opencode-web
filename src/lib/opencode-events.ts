/**
 * OpenCode Server-Sent Events types and client
 */

export interface ServerConnectedEvent {
  type: 'server.connected';
  properties: Record<string, any>;
}

export interface InstallationUpdatedEvent {
  type: 'installation.updated';
  properties: {
    version: string;
  };
}

export interface IdeInstalledEvent {
  type: 'ide.installed';
  properties: {
    ide: string;
  };
}

export interface SessionUpdatedEvent {
  type: 'session.updated';
  properties: {
    info: {
      id: string;
      title?: string;
      [key: string]: any;
    };
  };
}

export interface SessionDeletedEvent {
  type: 'session.deleted';
  properties: {
    info: {
      id: string;
      [key: string]: any;
    };
  };
}

export interface SessionCompactedEvent {
  type: 'session.compacted';
  properties: {
    sessionID: string;
  };
}

export interface SessionIdleEvent {
  type: 'session.idle';
  properties: {
    sessionID: string;
  };
}

export interface SessionErrorEvent {
  type: 'session.error';
  properties: {
    error: {
      type: string;
      message: string;
      [key: string]: any;
    };
    sessionID?: string;
  };
}

export interface MessageUpdatedEvent {
  type: 'message.updated';
  properties: {
    info: {
      id: string;
      role: 'user' | 'assistant';
      time: {
        created: number;
        modified?: number;
      };
      reverted?: boolean;
      tokens?: {
        input: number;
        output: number;
        reasoning: number;
      };
      cost?: number;
      modelID?: string;
      mode?: string;
      [key: string]: any;
    };
  };
}

export interface MessageRemovedEvent {
  type: 'message.removed';
  properties: {
    messageID: string;
    sessionID: string;
  };
}

export interface MessagePartUpdatedEvent {
  type: 'message.part.updated';
  properties: {
    sessionID?: string;
    messageID?: string;
    part: {
      type: string;
      [key: string]: any;
    };
  };
}

export interface MessagePartRemovedEvent {
  type: 'message.part.removed';
  properties: {
    messageID: string;
    partID: string;
    sessionID: string;
  };
}

export interface PermissionUpdatedEvent {
  type: 'permission.updated';
  properties: {
    id: string;
    sessionID: string;
    [key: string]: any;
  };
}

export interface PermissionRepliedEvent {
  type: 'permission.replied';
  properties: {
    permissionID: string;
    response: string;
    sessionID: string;
  };
}

export interface FileEditedEvent {
  type: 'file.edited';
  properties: {
    file: string;
  };
}

export interface FileWatcherUpdatedEvent {
  type: 'file.watcher.updated';
  properties: {
    file: string;
    event: 'add' | 'change' | 'unlink';
  };
}

export interface TodoUpdatedEvent {
  type: 'todo.updated';
  properties: {
    sessionID: string;
    todos: Array<{
      content: string;
      status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      priority: 'high' | 'medium' | 'low';
      id: string;
    }>;
  };
}

export interface LSPDiagnosticsEvent {
  type: 'lsp.client.diagnostics';
  properties: {
    path: string;
    serverID: string;
  };
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
  | LSPDiagnosticsEvent;

export interface SSEConnectionState {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
  lastEventId?: string;
}

export interface SSEClientOptions {
  url: string;
  onEvent: (event: OpencodeEvent) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  withCredentials?: boolean;
}

export class OpencodeSSEClient {
  private eventSource: EventSource | null = null;
  private options: SSEClientOptions;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private state: SSEConnectionState = {
    connected: false,
    reconnecting: false,
    error: null,
    reconnectAttempts: 0
  };

  constructor(options: SSEClientOptions) {
    this.options = {
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      withCredentials: false,
      ...options
    };
  }

  get connectionState(): SSEConnectionState {
    return this.state;
  }

  connect(): void {
    if (this.eventSource) {
      return;
    }

    try {
      this.eventSource = new EventSource(this.options.url, {
        withCredentials: this.options.withCredentials
      });

      this.eventSource.onopen = () => {
        console.log('[SSE] Connection opened');
        this.state = {
          connected: true,
          reconnecting: false,
          error: null,
          reconnectAttempts: 0
        };
        this.reconnectAttempts = 0;
        this.options.onConnect?.();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SSE] Received event:', data.type, data);
          this.options.onEvent(data);
        } catch (error) {
          console.error('[SSE] Failed to parse event data:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
        this.state = {
          ...this.state,
          connected: false,
          error: 'Connection failed'
        };
        
        this.options.onError?.(new Error('SSE connection failed'));
        this.handleReconnection();
      };

    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error);
      this.options.onError?.(error as Error);
      this.handleReconnection();
    }
  }

  private handleReconnection(): void {
    if (this.reconnectTimer) {
      return;
    }

    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts || 5)) {
      console.error('[SSE] Max reconnection attempts reached');
      this.state = {
        ...this.state,
        reconnecting: false,
        error: 'Max reconnection attempts reached'
      };
      this.options.onDisconnect?.();
      return;
    }

    this.reconnectAttempts++;
    this.state = {
      ...this.state,
      reconnecting: true,
      reconnectAttempts: this.reconnectAttempts
    };

    const delay = (this.options.reconnectDelay || 1000) * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

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
      reconnecting: false
    };

    this.options.onDisconnect?.();
  }

  reconnect(): void {
    console.log('[SSE] Manual reconnect requested');
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
}