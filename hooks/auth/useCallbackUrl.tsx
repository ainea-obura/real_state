"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

export function useCallbackUrl(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(() => {
    const raw = searchParams.get("callbackUrl");

    if (!raw) {
      // If no callbackUrl parameter, return the current path
      return pathname;
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(raw); // Decode once
    } catch {
      decoded = raw;
    }

    const [path, qs] = decoded.split("?");
    if (!qs) return path; // No query string to clean, just return the path

    const params = new URLSearchParams(qs);
    params.delete("callbackUrl"); // Remove any nested callbackUrl from the query string

    const cleanQs = params.toString();
    return cleanQs ? `${path}?${cleanQs}` : path;
  }, [pathname, searchParams]);
}
