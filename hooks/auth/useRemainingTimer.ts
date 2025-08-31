import { useCallback, useEffect, useState } from "react";

// This function formats the time into 00:00 format
const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
};

export function useRemainingTimer(type: "otp" | "email" | "password-reset", email: string) {
  const [remaining, setRemaining] = useState<number>(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/get-remaining-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, email }),
      });
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setRemaining(data.remaining as number);
    } catch {
      setRemaining(0);
    }
  }, [type, email]);

  // Fetch once on mount (and whenever type/email changes)
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Drive the countdown
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((r) => Math.max(r - 1, 0)), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  // Return formatted time in 00:00 format
  const formattedTime = formatTime(remaining);

  return { remaining, formattedTime, refresh };
}
