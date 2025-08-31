"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useForcePasswordChange() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.force_password_change) {
      // Check if we're already on the settings page with force=true
      const currentPath = window.location.pathname + window.location.search;
      if (!currentPath.includes("/settings?tab=passwords&force=true")) {
        router.replace("/settings?tab=passwords&force=true");
      }
    }
  }, [status, session?.user?.force_password_change, router]);

  const isForcePasswordChangeRequired = session?.user?.force_password_change || false;

  return {
    isForcePasswordChangeRequired,
  };
} 