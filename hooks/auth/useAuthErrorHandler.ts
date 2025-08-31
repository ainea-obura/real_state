"use client";
import { signOut, useSession } from 'next-auth/react';
import { useEffect } from 'react';

function clearAllCookies() {
  const cookies = document.cookie.split("; ");
  for (const cookie of cookies) {
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    document.cookie =
      name +
      "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" +
      window.location.pathname;
  }
}
export function useAuthErrorHandler() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      clearAllCookies();
      signOut({ callbackUrl: "/sign-in" });
    }
  }, [session?.error]);
}
