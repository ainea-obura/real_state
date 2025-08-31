// hooks/useSetRetryTimer.ts
import { useCallback } from "react";

export function useSetRetryTimer() {
  return useCallback(
    async (type: "otp" | "email", email: string, seconds: number) => {
      const res = await fetch("/api/set-retry-timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, email, seconds }),
      });
      if (!res.ok) throw new Error("Failed to set retry timer");
      return (await res.json()).success as boolean;
    },
    []
  );
}
