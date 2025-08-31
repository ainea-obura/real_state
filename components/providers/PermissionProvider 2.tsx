"use client";

import { useSession } from 'next-auth/react';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { getCurrentUserPermissions } from '@/actions/settings/staff';
import { getPermissionWebSocket, WebSocketHandlers, WebSocketState } from '@/lib/websocket';
import { useQueryClient } from '@tanstack/react-query';

// Types
export interface Permission {
  id: number;
  name: string;
  codename: string;
  content_type: {
    app_label: string;
    model: string;
  };
}

export interface Group {
  id: string;
  name: string;
}

interface PermissionContextValue {
  // Connection state (for debugging only)
  isConnected: boolean;
  connectionState: WebSocketState;

  // Permission data - always available from cache
  permissions: Permission[];
  groups: Group[];
  isLoading: boolean; // Always false for users, only true for initial app load
  error: string | null; // Always null for users, errors handled silently

  // Utility functions
  isSuperuser: boolean;
  hasPermission: (codename: string | string[]) => boolean;

  // Actions
  refreshPermissions: () => Promise<void>;
  reconnect: () => Promise<void>;

  // Debug info (only visible in development)
  debugInfo: {
    lastUpdate: Date | null;
    reconnectAttempts: number;
    connectionCount: number;
  };
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

// Global state management with cache-first approach
class PermissionManager {
  private static instance: PermissionManager;
  private ws: ReturnType<typeof getPermissionWebSocket> | null = null;
  private isInitialized = false;
  private currentToken: string | null = null;
  private subscribers = new Set<() => void>();

  // State - all user-facing states are stable
  public connectionState: WebSocketState = "disconnected";
  public permissions: Permission[] = [];
  public groups: Group[] = [];
  public isLoading = false; // Never show loading to users after initial load
  public error: string | null = null; // Never show errors to users
  public lastUpdate: Date | null = null;
  public reconnectAttempts = 0;
  private hasInitialLoad = false; // Track if we've ever loaded permissions

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  private setState(updates: Partial<typeof this>) {
    Object.assign(this, updates);
    this.notifySubscribers();
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    this.subscribers.forEach((callback) => callback());
  }

  cleanup() {
    console.log("[PermissionManager] Cleaning up...");
    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
    }
    this.isInitialized = false;
    this.setState({ connectionState: "disconnected" });
  }

  async initialize(token: string, queryClient: any) {
    if (this.isInitialized && this.currentToken === token) {
      console.log("[PermissionManager] Already initialized for current token");
      return;
    }

    console.log("[PermissionManager] Initializing...");

    // Clean up previous connection if token changed
    if (this.currentToken && this.currentToken !== token) {
      console.log("[PermissionManager] Token changed, cleaning up...");
      this.cleanup();
    }

    this.currentToken = token;

    // Only show loading on very first load, never again
    if (!this.hasInitialLoad) {
      this.setState({ isLoading: true, error: null });
    }

    try {
      // Always load/refresh permissions in background
      this.loadPermissionsInBackground(queryClient);

      // Initialize WebSocket connection silently
      this.initializeWebSocketSilently(token, queryClient);

      this.isInitialized = true;
    } catch (error) {
      console.log(
        "[PermissionManager] Initialization error - handling silently:",
        error
      );
      // Don't set error state - keep it silent
      if (!this.hasInitialLoad) {
        this.setState({ isLoading: false });
      }
    }
  }

  private async loadPermissionsInBackground(queryClient: any) {
    try {
      console.log("[PermissionManager] Loading permissions in background...");
      const result = await getCurrentUserPermissions();

      if (result && !result.error) {
        const data = result.data;
        this.setState({
          permissions: data.direct_permissions || [],
          groups: data.groups || [],
          lastUpdate: new Date(),
          isLoading: false, // Only set false after first successful load
        });

        this.hasInitialLoad = true;
        console.log(
          "[PermissionManager] Permissions loaded:",
          data.direct_permissions?.length || 0
        );
      } else {
        // If we have cached permissions, keep using them
        if (this.permissions.length > 0) {
          console.log(
            "[PermissionManager] API failed, using cached permissions"
          );
        } else {
          // Only set loading false if this was the initial load
          if (!this.hasInitialLoad) {
            this.setState({ isLoading: false });
            this.hasInitialLoad = true;
          }
        }
      }
    } catch (error) {
      console.log(
        "[PermissionManager] Background permission load failed:",
        error
      );
      // Silently fail - keep using cached data
      if (!this.hasInitialLoad) {
        this.setState({ isLoading: false });
        this.hasInitialLoad = true;
      }
    }
  }

  private async initializeWebSocketSilently(token: string, queryClient: any) {
    try {
      this.setState({ connectionState: "connecting" });

      this.ws = getPermissionWebSocket();

      const handlers: WebSocketHandlers = {
        onConnect: () => {
          console.log("[PermissionManager] WebSocket connected");
          this.setState({
            connectionState: "connected",
            reconnectAttempts: 0,
          });
        },

        onDisconnect: () => {
          console.log("[PermissionManager] WebSocket disconnected");
          this.setState({ connectionState: "disconnected" });
        },

        onError: (error) => {
          console.log(
            "[PermissionManager] WebSocket error - handling silently:",
            error
          );
          // Don't set error states - keep connection working silently
          this.setState({ connectionState: "disconnected" });
        },

        onConnectionSuccess: (data) => {
          console.log(
            "[PermissionManager] WebSocket authentication successful:",
            data.user_id
          );
          // No user-facing feedback needed
        },

        onPermissionUpdate: (data) => {
          console.log(
            "[PermissionManager] Permission update received:",
            data.action
          );
          this.refreshPermissionsInBackground(queryClient);
        },

        onUserPermissionChange: (data) => {
          console.log(
            "[PermissionManager] User permission change received:",
            data.action
          );

          // Update permissions immediately if provided
          if (data.permissions) {
            const formattedPermissions = data.permissions.map((perm: any) => ({
              ...perm,
              content_type: {
                app_label: perm.content_type__app_label || "",
                model: perm.content_type__model || "",
              },
            }));

            this.setState({
              permissions: formattedPermissions,
              groups: data.groups || this.groups,
              lastUpdate: new Date(),
            });
          }

          // Also refresh from server in background
          this.refreshPermissionsInBackground(queryClient);
        },
      };

      this.ws.setHandlers(handlers);
      await this.ws.connect(token);
    } catch (error) {
      console.log(
        "[PermissionManager] WebSocket initialization failed - handling silently:",
        error
      );
      this.setState({
        connectionState: "disconnected",
        reconnectAttempts: this.reconnectAttempts + 1,
      });
    }
  }

  async refreshPermissions(queryClient: any) {
    // Public method - just trigger background refresh
    this.refreshPermissionsInBackground(queryClient);
  }

  private async refreshPermissionsInBackground(queryClient: any) {
    try {
      console.log(
        "[PermissionManager] Refreshing permissions in background..."
      );

      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ["permissions"] });
      const result = await getCurrentUserPermissions();

      if (result && !result.error) {
        const data = result.data;
        this.setState({
          permissions: data.direct_permissions || [],
          groups: data.groups || [],
          lastUpdate: new Date(),
        });
        console.log(
          "[PermissionManager] Permissions refreshed:",
          data.direct_permissions?.length || 0
        );
      }
    } catch (error) {
      console.log(
        "[PermissionManager] Background permission refresh failed:",
        error
      );
      // Silently fail - keep existing permissions
    }
  }

  async reconnect() {
    console.log("[PermissionManager] Manual reconnect requested");
    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
    }

    if (this.currentToken) {
      this.initializeWebSocketSilently(this.currentToken, null);
    }
  }

  hasPermission(codename: string | string[], isSuperuser: boolean): boolean {
    if (isSuperuser) return true;

    const userPermissions = this.permissions?.map((p) => p.codename) || [];

    if (Array.isArray(codename)) {
      return codename.some((c) => userPermissions.includes(c));
    }
    return userPermissions.includes(codename);
  }

  getDebugInfo() {
    return {
      lastUpdate: this.lastUpdate,
      reconnectAttempts: this.reconnectAttempts,
      connectionCount: this.ws ? 1 : 0,
    };
  }
}

// Provider component
export function PermissionProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const manager = PermissionManager.getInstance();
  const [, forceUpdate] = useState({});

  // Subscribe to manager updates
  useEffect(() => {
    const unsubscribe = manager.subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, [manager]);

  // Initialize when session is available
  useEffect(() => {
    if (session?.accessToken) {
      manager.initialize(session.accessToken, queryClient);
    } else {
      manager.cleanup();
    }
  }, [session?.accessToken, queryClient, manager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't cleanup on unmount to maintain connection across pages
      // Only cleanup when session changes or app closes
    };
  }, []);

  const isSuperuser = session?.user?.type === "company";

  const contextValue: PermissionContextValue = {
    isConnected: manager.connectionState === "connected",
    connectionState: manager.connectionState,
    permissions: manager.permissions,
    groups: manager.groups,
    isLoading: manager.isLoading, // Only true on very first app load
    error: null, // Always null - errors handled silently
    isSuperuser,
    hasPermission: (codename) => manager.hasPermission(codename, isSuperuser),
    refreshPermissions: () => manager.refreshPermissions(queryClient),
    reconnect: async () => {
      await manager.reconnect();
    },
    debugInfo: manager.getDebugInfo(),
  };

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
}

// Hook to use permissions
export function usePermissions(): PermissionContextValue {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
}
