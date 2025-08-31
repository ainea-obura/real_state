// hooks/useRequireVerify.ts
"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useRequireVerify(type: "otp" | "email") {
  const { status } = useSession();
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status !== "loading") {
      // check the HttpOnly cookie via a quick endpoint
      fetch("/api/check-verify-cookie", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ type }),
      })
        .then((res) => res.ok)
        .then((ok) => {
          if (!ok || status !== "authenticated") {
            router.replace("/sign-in");
          } else {
            setAllowed(true);
          }
        });
    }
  }, [status, router, type]);

  return allowed;
}
