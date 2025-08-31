import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getCurrentUserPermissions } from '@/actions/settings/staff';
import {
    disconnectPermissionWebSocket, getPermissionWebSocket, initializePermissionWebSocket,
    WebSocketHandlers, WebSocketState,
} from '@/lib/websocket';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Types for permission data
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

export interface UserPermissions {
  permissions: Permission[];
  groups: Group[];
}

// Hook return type - simplified for background operation
export interface UsePermissionWebSocketReturn {
  // Connection state (for debugging only)
  isConnected: boolean;
  connectionState: WebSocketState;

  // Permission data - always available from cache
  permissions: Permission[];
  groups: Group[];
  isLoading: boolean; // Only true on very first load
  error: string | null; // Always null - errors handled silently

  // Superuser and permission utility
  isSuperuser: boolean;
  hasPermission: (codename: string | string[]) => boolean;

  // Actions
  refreshPermissions: () => Promise<void>;
  reconnect: () => Promise<void>;

  // Debug info
  debugInfo: {
    lastUpdate: Date | null;
    reconnectAttempts: number;
    wsInstance: any;
  };
}

export function usePermissionWebSocket(): UsePermissionWebSocketReturn {
  const { data: session } = useSession();
  const [connectionState, setConnectionState] =
    useState<WebSocketState>("disconnected");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Only true on very first load
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef<ReturnType<typeof getPermissionWebSocket> | null>(null);
  const isInitializedRef = useRef(false);
  const currentSessionRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const lastFetchRef = useRef<number>(0);
  const hasInitialLoadRef = useRef(false);
  const DEBOUNCE_INTERVAL = 3000; // 3 seconds

  // Load initial permissions using React Query - cache-first approach
  const {
    data: queryPermissions,
    isLoading: queryLoading,
    error: queryError,
    refetch: refetchPermissions,
  } = useQuery({
    queryKey: ["permissions"],
    queryFn: getCurrentUserPermissions,
    enabled: !!session?.accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Sync permissions state with queryPermissions - immediate update
  useEffect(() => {
    if (queryPermissions && !queryPermissions.error) {
      const data = queryPermissions.data;
      setPermissions(data.direct_permissions || []);
      setGroups(data.groups || []);
      setLastUpdate(new Date());

      // Only set loading false after first successful load
      if (!hasInitialLoadRef.current) {
        setIsLoading(false);
        hasInitialLoadRef.current = true;
      }

      console.log(
        "[usePermissionWebSocket] Permissions synced from query:",
        data.direct_permissions?.length || 0
      );
    } else if (!hasInitialLoadRef.current && !queryLoading) {
      // First load failed, but don't show error - just mark as loaded
      setIsLoading(false);
      hasInitialLoadRef.current = true;
    }
  }, [queryPermissions, queryLoading]);

  // Load permissions (for manual refresh or WebSocket update) - background only
  const loadPermissions = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < DEBOUNCE_INTERVAL) {
      console.log(
        "[usePermissionWebSocket] Skipping permission fetch due to debounce"
      );
      return;
    }
    lastFetchRef.current = now;

    try {
      console.log(
        "[usePermissionWebSocket] Refreshing permissions in background..."
      );
      await queryClient.invalidateQueries({ queryKey: ["permissions"] });
      const result = await refetchPermissions();

      if (result.data && !result.data.error) {
        setLastUpdate(new Date());
        console.log(
          "[usePermissionWebSocket] Permissions refreshed successfully"
        );
      }
    } catch (err) {
      console.log(
        "[usePermissionWebSocket] Background permission refresh failed:",
        err
      );
      // Silently fail - keep existing permissions
    }
  }, [queryClient, refetchPermissions]);

  // WebSocket event handlers - all silent
  const wsHandlers: WebSocketHandlers = useMemo(
    () => ({
      onConnect: () => {
        console.log("[usePermissionWebSocket] WebSocket connected");
        setConnectionState("connected");
        setReconnectAttempts(0);
      },

      onDisconnect: () => {
        console.log("[usePermissionWebSocket] WebSocket disconnected");
        setConnectionState("disconnected");
      },

      onError: (error) => {
        console.log(
          "[usePermissionWebSocket] WebSocket error - handling silently:",
          error
        );
        setConnectionState("disconnected");
        // Don't propagate error - handle silently
      },

      onConnectionSuccess: (data) => {
        console.log(
          "[usePermissionWebSocket] WebSocket authentication successful:",
          data.user_id
        );
        // No user-facing feedback needed
      },

      onPermissionUpdate: (data) => {
        console.log(
          "[usePermissionWebSocket] Permission update received:",
          data.action
        );
        // Refresh permissions in background
        loadPermissions();
      },

      onUserPermissionChange: (data) => {
        console.log(
          "[usePermissionWebSocket] User permission change received:",
          data.action
        );

        // Update permissions immediately if provided in the message
        if (data.permissions) {
          const formattedPermissions = data.permissions.map((perm: any) => ({
            ...perm,
            content_type: {
              app_label: perm.content_type__app_label || "",
              model: perm.content_type__model || "",
            },
          }));
          setPermissions(formattedPermissions);
          setLastUpdate(new Date());
        }

        if (data.groups) {
          setGroups(data.groups);
        }

        // Also refresh from server to ensure we have the latest data
        loadPermissions();
      },
    }),
    [loadPermissions]
  );

  // Initialize WebSocket connection - completely silent
  const initializeWebSocket = useCallback(async () => {
    const sessionToken = session?.accessToken;

    if (!sessionToken) {
      console.log(
        "[usePermissionWebSocket] No session token available for WebSocket"
      );
      return;
    }

    if (
      isInitializedRef.current &&
      currentSessionRef.current === sessionToken
    ) {
      console.log(
        "[usePermissionWebSocket] WebSocket already initialized for current session"
      );
      return;
    }

    // Check if session changed
    if (
      currentSessionRef.current &&
      currentSessionRef.current !== sessionToken
    ) {
      console.log(
        "[usePermissionWebSocket] Session changed, cleaning up old WebSocket connection"
      );
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      isInitializedRef.current = false;
    }

    currentSessionRef.current = sessionToken;

    try {
      setConnectionState("connecting");

      console.log(
        "[usePermissionWebSocket] Initializing WebSocket connection..."
      );
      const ws = await initializePermissionWebSocket(sessionToken, wsHandlers);
      wsRef.current = ws;
      isInitializedRef.current = true;
    } catch (err) {
      console.log(
        "[usePermissionWebSocket] Failed to initialize WebSocket - handling silently:",
        err
      );
      setConnectionState("disconnected");
      setReconnectAttempts((prev) => prev + 1);
      // Don't propagate error - just continue silently
    }
  }, [session?.accessToken, wsHandlers]);

  // Reconnect function - completely silent
  const reconnect = useCallback(async () => {
    console.log("[usePermissionWebSocket] Manual reconnect requested");

    if (wsRef.current) {
      wsRef.current.disconnect();
    }

    isInitializedRef.current = false;
    currentSessionRef.current = null;
    wsRef.current = null;

    await initializeWebSocket();
  }, [initializeWebSocket]);

  // Refresh permissions from server - background only
  const refreshPermissions = useCallback(async () => {
    console.log("[usePermissionWebSocket] Manual permission refresh requested");
    await loadPermissions();
  }, [loadPermissions]);

  // Initialize on mount and when session changes
  useEffect(() => {
    console.log("[usePermissionWebSocket] Effect triggered", {
      hasToken: !!session?.accessToken,
      isInitialized: isInitializedRef.current,
    });

    if (session?.accessToken) {
      // Only set loading on very first initialization
      if (!hasInitialLoadRef.current && queryLoading) {
        setIsLoading(true);
      }

      // Load initial permissions if needed
      if (permissions.length === 0 && !queryLoading) {
        loadPermissions();
      }

      // Initialize WebSocket silently
      initializeWebSocket();
    } else {
      // Clean up when no session
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      isInitializedRef.current = false;
      currentSessionRef.current = null;
      setConnectionState("disconnected");
    }

    // Cleanup function
    return () => {
      console.log("[usePermissionWebSocket] Effect cleanup");
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
      // Don't reset refs here as it might cause issues with React strict mode
    };
  }, [
    session?.accessToken,
    loadPermissions,
    initializeWebSocket,
    permissions.length,
    queryLoading,
  ]);

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("[usePermissionWebSocket] Final cleanup on unmount");
      disconnectPermissionWebSocket();
    };
  }, []);

  // Compute derived values
  const isSuperuser = session?.user?.type === "company";
  const userPermissions = permissions?.map((p) => p.codename) || [];

  const hasPermission = useCallback(
    (codename: string | string[]): boolean => {
      if (isSuperuser) return true;
      if (Array.isArray(codename)) {
        return codename.some((c) => userPermissions.includes(c));
      }
      return userPermissions.includes(codename);
    },
    [isSuperuser, userPermissions]
  );

  return {
    // Connection state (for debugging only)
    isConnected: connectionState === "connected",
    connectionState,

    // Permission data - always available
    permissions,
    groups,
    isLoading: isLoading && !hasInitialLoadRef.current, // Only show loading on very first load
    error: null, // Always null - errors handled silently

    // Superuser and permission utility
    isSuperuser,
    hasPermission,

    // Actions
    refreshPermissions,
    reconnect,

    // Debug info
    debugInfo: {
      lastUpdate,
      reconnectAttempts,
      wsInstance: wsRef.current,
    },
  };
}
