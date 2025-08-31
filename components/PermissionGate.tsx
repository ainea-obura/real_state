"use client";
import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';

import ForbiddenPage from '@/components/ForbiddenPage';
import { usePermissions } from '@/components/providers/PermissionProvider';
import WelcomePage from '@/components/WelcomePage';

// Connection status indicator (only visible in development for debugging)
const ConnectionStatus = ({
  isConnected,
  connectionState,
  debugInfo,
}: {
  isConnected: boolean;
  connectionState: string;
  debugInfo: any;
}) => {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="right-4 bottom-4 z-50 fixed">
      <div
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          isConnected
            ? "bg-green-100 text-green-800 border border-green-200"
            : "bg-red-100 text-red-800 border border-red-200"
        }`}
      >
        WS: {connectionState} | Subs: {debugInfo.connectionCount}
      </div>
    </div>
  );
};

export function PermissionGate({
  codename,
  children,
  fallback = <ForbiddenPage />,
  showFallback = true,
  showConnectionStatus = false,
}: {
  codename: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
  showFallback?: boolean;
  showConnectionStatus?: boolean;
}) {
  const { hasPermission, isConnected, connectionState, debugInfo } =
    usePermissions();
  const { data: session } = useSession();

  // If no session, don't render anything (handled by auth middleware)
  if (!session) {
    return null;
  }

  // Always check permissions immediately - no loading states
  // Permissions are always available from cache or initial load
  if (hasPermission(codename)) {
    return (
      <>
        {children}
        {showConnectionStatus && (
          <ConnectionStatus
            isConnected={isConnected}
            connectionState={connectionState}
            debugInfo={debugInfo}
          />
        )}
      </>
    );
  }

  // Handle dashboard permission specifically - show welcome page
  if (
    Array.isArray(codename)
      ? codename.includes("view_dashboard")
      : codename === "view_dashboard"
  ) {
    return <WelcomePage />;
  }

  // Return fallback or nothing - never show loading or error states
  return showFallback ? fallback : null;
}
