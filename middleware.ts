// middleware.ts

import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

import { validateVerificationParams } from '@/lib/verification';

import type { NextRequest } from "next/server";
/**
 * JWT payload shape extended with our custom fields.
 */
type AuthToken = {
  accessToken?: string;
  expiresAt?: number | string;
  company?: string | null;
  force_password_change?: boolean;
  user?: {
    id: string;
    email: string;
  };
};

/**
 * Routes that can be accessed without any auth.
 */
const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forget-password",
  "/_next",
  "/static",
  "/favicon.ico",
  "/images",
];

// Helper to get the production base URL
function getBaseUrl(req: NextRequest): string {
  // For production, use the request host to maintain consistency
  const host = req.headers.get("host");
  const protocol =
    req.headers.get("x-forwarded-proto") ||
    (host?.includes("localhost") ? "http" : "https");

  if (host) {
    return `${protocol}://${host}`;
  }

  // Fallback to environment variables
  const productionUrl =
    process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (productionUrl) {
    return productionUrl;
  }

  // Final fallback
  return process.env.NEXT_PUBLIC_BASE_URL as string;
}

// Simplify isPublicPath to handle both exact prefixes and a wildcard for /api/**
function isPublicPath(pathname: string): boolean {
  // a) exact or prefix matches
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return true;
  }
  // b) wildcard match for all /api routes
  if (pathname.startsWith("/api/")) {
    return true;
  }
  return false;
}

/**
 * Protected verification pages that require secure tokens
 */
const PROTECTED_VERIFICATION_PAGES: Record<string, string> = {
  "/verify-otp": "otp",
  "/verify-email": "email",
  "/create-company": "company-creation",
  "/reset-password": "password-reset",
  "/verify-password-reset-otp": "password-reset-otp",
};

/**
 * Main middleware entry point.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const baseUrl = getBaseUrl(req);

  // Helper to strip existing callbackUrl params and create proper production URL
  const cleanCallbackUrl = (path: string) => {
    const url = new URL(path, baseUrl);
    url.searchParams.delete("callbackUrl");
    return url.toString();
  };

  // Redirect to sign-in, clearing auth cookies and preserving callbackUrl+error
  const redirectToSignIn = (error?: string) => {
    const signInUrl = new URL("/sign-in", baseUrl);

    // Create proper callback URL with production domain
    const callbackPath = pathname + search;
    const fullCallbackUrl = cleanCallbackUrl(callbackPath);

    signInUrl.searchParams.set("callbackUrl", fullCallbackUrl);
    if (error) signInUrl.searchParams.set("error", error);

    const res = NextResponse.redirect(signInUrl.toString());

    // Clear NextAuth session cookies
    res.cookies.delete("next-auth.session-token");
    res.cookies.delete("next-auth.csrf-token");
    res.cookies.delete("next-auth.callback-url");
    return res;
  };

  // 1️⃣ Handle protected verification pages - validate secure tokens
  if (PROTECTED_VERIFICATION_PAGES[pathname]) {
    const expectedType = PROTECTED_VERIFICATION_PAGES[pathname];
    const token = req.nextUrl.searchParams.get("token");

    console.log(
      `[Middleware] Validating access to protected page: ${pathname}`
    );

    // Special case: Allow authenticated users without companies to access /create-company
    if (pathname === "/create-company") {
      try {
        const authToken = (await getToken({
          req,
          secret: process.env.NEXTAUTH_SECRET,
          secureCookie: process.env.NODE_ENV === "production",
        })) as AuthToken | null;

        // If user is authenticated but has no company, allow access without token
        if (authToken?.accessToken && !authToken.company) {
          console.log(
            `[Middleware] Allowing authenticated user without company to access /create-company`
          );
          return NextResponse.next();
        }
      } catch (error) {
        console.log(
          `[Middleware] Auth token check failed for /create-company:`,
          error
        );
      }
    }

    try {
      const validation = await validateVerificationParams(token, expectedType);

      if (!validation.valid) {
        console.log(
          `[Middleware] Invalid token for ${pathname}: ${validation.error}`
        );

        // For invalid/expired verification tokens, redirect to sign-in without the verification URL as callback
        // This prevents redirect loops
        const signInUrl = new URL("/sign-in", baseUrl);
        signInUrl.searchParams.set(
          "error",
          "Invalid or expired verification link"
        );

        const res = NextResponse.redirect(signInUrl.toString());
        res.cookies.delete("next-auth.session-token");
        res.cookies.delete("next-auth.csrf-token");
        res.cookies.delete("next-auth.callback-url");
        return res;
      }

      console.log(`[Middleware] Valid token for ${pathname}, allowing access`);
      return NextResponse.next();
    } catch (error) {
      console.log(
        `[Middleware] Token validation failed for ${pathname}:`,
        error
      );

      // For validation errors, redirect to sign-in without the verification URL as callback
      const signInUrl = new URL("/sign-in", baseUrl);
      signInUrl.searchParams.set("error", "Invalid verification link");

      const res = NextResponse.redirect(signInUrl.toString());
      res.cookies.delete("next-auth.session-token");
      res.cookies.delete("next-auth.csrf-token");
      res.cookies.delete("next-auth.callback-url");
      return res;
    }
  }

  // 2️⃣ Bypass all public routes
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 3️⃣ Validate NextAuth JWT
  let token: AuthToken | null = null;
  try {
    token = (await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    })) as AuthToken | null;
  } catch (error) {
    console.log(
      `[Middleware] JWT validation failed:`,
      error instanceof Error ? error.message : String(error)
    );
    return redirectToSignIn();
  }

  if (!token?.accessToken) {
    return redirectToSignIn();
  }

  // 4️⃣ Check token expiration
  const expiresAt =
    typeof token.expiresAt === "string"
      ? parseInt(token.expiresAt, 10)
      : token.expiresAt;
  if (expiresAt && Date.now() > expiresAt) {
    return redirectToSignIn("SessionExpired");
  }

  // 5️⃣ Enforce "create-company" step
  const hasCompany = Boolean(token.company);
  if (!hasCompany && pathname !== "/create-company") {
    const url = new URL("/create-company", baseUrl);
    url.searchParams.set("callbackUrl", cleanCallbackUrl(pathname + search));
    return NextResponse.redirect(url.toString());
  }
  if (hasCompany && pathname === "/create-company") {
    const url = new URL("/", baseUrl);
    return NextResponse.redirect(url.toString());
  }

  // 6️⃣ Enforce force password change
  const forcePasswordChange = Boolean(token.force_password_change);
  if (forcePasswordChange && pathname !== "/settings") {
    const url = new URL("/settings", baseUrl);
    url.searchParams.set("tab", "passwords");
    url.searchParams.set("force", "true");
    return NextResponse.redirect(url.toString());
  }
  if (
    !forcePasswordChange &&
    pathname === "/settings" &&
    req.nextUrl.searchParams.get("force") === "true"
  ) {
    const url = new URL("/", baseUrl);
    return NextResponse.redirect(url.toString());
  }

  // 7️⃣ All checks passed: inject user headers and continue
  const headers = new Headers(req.headers);
  if (token.user?.id) headers.set("x-auth-user-id", token.user.id);
  if (token.company) headers.set("x-auth-user-company", token.company);
  return NextResponse.next({ request: { headers } });
}

/**
 * Apply this middleware to all non-static, non-system routes.
 */
export const config = {
  matcher: ["/((?!_next|static|favicon.ico).*)"],
};
