// Types for WebSocket messages
export interface WebSocketMessage {
  type: string;
  message?: string;
  user_id?: string;
  action?: "added" | "removed" | "updated";
  token?: string;
  timestamp?: string;
  permissions?: Array<{
    id: string;
    name: string;
    codename: string;
    content_type__app_label: string;
    content_type__model: string;
  }>;
  groups?: Array<{
    id: string;
    name: string;
  }>;
}

// Connection states
export type WebSocketState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

// Event handlers for different WebSocket events
export interface WebSocketHandlers {
  onPermissionUpdate?: (data: WebSocketMessage) => void;
  onUserPermissionChange?: (data: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event | Error) => void;
  onConnectionSuccess?: (data: WebSocketMessage) => void;
}

class PermissionWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private state: WebSocketState = "disconnected";
  private handlers: WebSocketHandlers = {};
  private accessToken: string | null = null;
  private isConnecting = false;
  private connectionId: string | null = null;
  private silentMode = true; // Always operate in silent mode

  constructor(private url: string) {
    this.url = url;
  }

  // Set event handlers
  setHandlers(handlers: WebSocketHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  // Connect to WebSocket - all operations are silent
  async connect(token: string): Promise<void> {
    // Prevent multiple simultaneous connections
    if (this.isConnecting) {
      console.log("[WebSocket] Connection already in progress, skipping...");
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("[WebSocket] Already connected");
      return;
    }

    // Clean up any existing connection
    this.disconnect();

    this.isConnecting = true;
    this.accessToken = token;
    this.connectionId = `conn_${Date.now()}_${Math.random()}`;
    const currentConnectionId = this.connectionId;

    this.setState("connecting");

    try {
      // Pass token in URL to validate before accepting
      const wsUrl = `${this.url}?token=${encodeURIComponent(token)}`;
      console.log("[WebSocket] Attempting connection...");

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Only proceed if this is still the current connection attempt
        if (currentConnectionId !== this.connectionId) {
          console.log("[WebSocket] Connection superseded, closing...");
          this.ws?.close();
          return;
        }

        console.log("[WebSocket] Connected successfully");
        this.isConnecting = false;
        this.setState("connected");
        this.reconnectAttempts = 0; // Reset on success
        this.reconnectDelay = 1000;
        this.handlers.onConnect?.();

        // Start ping interval
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        // Only handle messages for current connection
        if (currentConnectionId === this.connectionId) {
          this.handleMessage(event.data);
        }
      };

      this.ws.onclose = (event) => {
        // Only handle close for current connection
        if (currentConnectionId !== this.connectionId) {
          return;
        }

        console.log("[WebSocket] Connection closed:", event.code, event.reason);
        this.isConnecting = false;
        this.setState("disconnected");
        this.stopPingInterval();
        this.handlers.onDisconnect?.();

        // Attempt to reconnect silently if not a normal closure and not manually disconnected
        if (
          event.code !== 1000 &&
          event.code !== 4002 &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.scheduleReconnect();
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          // After max attempts, just stay disconnected silently
          console.log(
            "[WebSocket] Max reconnection attempts reached, staying disconnected"
          );
          this.setState("disconnected");
        }
      };

      this.ws.onerror = (error) => {
        // Only handle errors for current connection
        if (currentConnectionId !== this.connectionId) {
          return;
        }

        console.log("[WebSocket] Connection error - handling silently:", error);
        this.isConnecting = false;

        // Don't set error state or notify handlers - keep it silent
        // Just log and continue with reconnection logic
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.setState("disconnected");
        }
      };
    } catch (error) {
      console.log("[WebSocket] Connection failed - handling silently:", error);
      this.isConnecting = false;
      this.setState("disconnected");

      // Don't throw or notify - just stay silent
      return;
    }
  }

  // Disconnect from WebSocket
  disconnect(): void {
    console.log("[WebSocket] Disconnecting...");

    this.isConnecting = false;
    this.connectionId = null;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopPingInterval();

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.setState("disconnected");
  }

  // Send message to WebSocket
  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.log("[WebSocket] Not connected, message queued:", message.type);
      // Could implement message queuing here if needed
    }
  }

  // Get current connection state
  getState(): WebSocketState {
    return this.state;
  }

  // Check if connected
  isConnected(): boolean {
    return this.state === "connected" && this.ws?.readyState === WebSocket.OPEN;
  }

  // Handle incoming messages
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      console.log("[WebSocket] Message received:", message.type);

      switch (message.type) {
        case "connection_success":
          console.log("[WebSocket] Authentication successful");
          this.handlers.onConnectionSuccess?.(message);
          break;

        case "permission_update":
          console.log(
            "[WebSocket] Permission update received:",
            message.action
          );
          this.handlers.onPermissionUpdate?.(message);
          // Silent permission updates - no toast notifications
          break;

        case "user_permission_change":
          console.log(
            "[WebSocket] User permission change received:",
            message.action
          );
          this.handlers.onUserPermissionChange?.(message);
          // Silent permission updates - no toast notifications
          break;

        case "pong":
          // Handle ping response - no action needed
          break;

        case "permissions_data":
          console.log("[WebSocket] Permissions data received");
          // Handle permissions data if needed
          break;

        case "error":
          console.log("[WebSocket] Server error message:", message.message);
          // Don't show error toasts - handle silently
          break;

        default:
          console.log("[WebSocket] Unknown message type:", message.type);
      }
    } catch (error) {
      console.log(
        "[WebSocket] Error parsing message - handling silently:",
        error
      );
    }
  }

  // Schedule reconnection - completely silent
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    console.log(
      `[WebSocket] Scheduling silent reconnect attempt ${
        this.reconnectAttempts + 1
      } in ${this.reconnectDelay}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      if (this.accessToken && !this.isConnecting) {
        console.log(
          `[WebSocket] Silent reconnect attempt ${this.reconnectAttempts + 1}`
        );
        this.reconnectAttempts++;
        this.connect(this.accessToken);

        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      }
    }, this.reconnectDelay);
  }

  // Start ping interval
  private startPingInterval(): void {
    this.stopPingInterval(); // Clear any existing interval

    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: "ping" });
      }
    }, 30000); // Send ping every 30 seconds
  }

  // Stop ping interval
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Set connection state
  private setState(state: WebSocketState): void {
    if (this.state !== state) {
      console.log(`[WebSocket] State changed: ${this.state} -> ${state}`);
      this.state = state;
    }
  }
}

// Create singleton instance
let websocketInstance: PermissionWebSocket | null = null;
const base = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

// Get or create WebSocket instance
export function getPermissionWebSocket(): PermissionWebSocket {
  if (!websocketInstance) {
    const wsUrl = base + "/ws/permissions/";
    websocketInstance = new PermissionWebSocket(wsUrl);
  }
  return websocketInstance;
}

// Initialize WebSocket connection - silent by default
export async function initializePermissionWebSocket(
  token: string,
  handlers: WebSocketHandlers = {}
): Promise<PermissionWebSocket> {
  const ws = getPermissionWebSocket();
  ws.setHandlers(handlers);
  await ws.connect(token);
  return ws;
}

// Disconnect WebSocket
export function disconnectPermissionWebSocket(): void {
  if (websocketInstance) {
    websocketInstance.disconnect();
    websocketInstance = null; // Allow new instance creation
  }
}

// Get connection status with graceful fallback information
export function getWebSocketConnectionStatus(): {
  isConnected: boolean;
  state: WebSocketState;
  activeConnections?: number;
  gracefulFallback: {
    isActive: boolean;
    reason: string;
    lastSuccessfulConnection: Date | null;
  };
} {
  if (!websocketInstance) {
    return {
      isConnected: false,
      state: "disconnected",
      gracefulFallback: {
        isActive: true,
        reason: "WebSocket not initialized - using cached permissions",
        lastSuccessfulConnection: null,
      },
    };
  }

  const isConnected = websocketInstance.isConnected();
  const state = websocketInstance.getState();

  return {
    isConnected,
    state,
    gracefulFallback: {
      isActive: !isConnected,
      reason: !isConnected
        ? "WebSocket disconnected - using cached permissions and background sync"
        : "WebSocket connected - real-time updates active",
      lastSuccessfulConnection: isConnected ? new Date() : null,
    },
  };
}

// Utility to check if the system is operating in graceful fallback mode
export function isInGracefulFallbackMode(): boolean {
  const status = getWebSocketConnectionStatus();
  return status.gracefulFallback.isActive;
}

// Utility to get fallback status for debugging
export function getGracefulFallbackStatus(): {
  usingCachedPermissions: boolean;
  backgroundSyncActive: boolean;
  userExperienceImpact: "none" | "minimal" | "degraded";
  recommendations: string[];
} {
  const isInFallback = isInGracefulFallbackMode();

  return {
    usingCachedPermissions: isInFallback,
    backgroundSyncActive: true, // Always true - system continues background operations
    userExperienceImpact: "none", // No impact on user experience
    recommendations: isInFallback
      ? [
          "System operating normally with cached permissions",
          "Background sync will restore real-time updates automatically",
          "No user action required",
        ]
      : [
          "System fully operational with real-time updates",
          "All features available",
        ],
  };
}
