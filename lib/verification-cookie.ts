// lib/verification.ts (renamed from verification-cookie.ts)

/**
 * Create verification URL with parameters - no cookies needed
 */
export function createVerificationUrl(
  type: "otp" | "email" | "user-creation" | "company-creation",
  email: string,
  basePath: string,
  callbackUrl?: string
): string {
  const url = new URL(basePath, window.location.origin);
  url.searchParams.set("email", email);
  url.searchParams.set("verification_type", type);
  url.searchParams.set("timestamp", Date.now().toString());

  if (callbackUrl) {
    url.searchParams.set("callbackUrl", callbackUrl);
  }

  console.log(`[Verification] Created verification URL: ${url.toString()}`);
  return url.toString();
}

/**
 * Simplified verification URL creator - always succeeds
 */
export async function createVerificationRedirect(
  type: "otp" | "email" | "user-creation" | "company-creation",
  email: string,
  fallbackPath: string,
  callbackUrl?: string
): Promise<{
  success: boolean;
  redirectUrl: string;
  method: "url_params";
}> {
  console.log(`[Verification] Creating ${type} verification URL for ${email}`);

  const redirectUrl = createVerificationUrl(
    type,
    email,
    fallbackPath,
    callbackUrl
  );

  return {
    success: true,
    redirectUrl,
    method: "url_params",
  };
}

/**
 * Validate verification URL parameters
 */
export function validateVerificationParams(
  email: string | null,
  verificationType: string | null,
  timestamp: string | null,
  expectedType: string
): {
  valid: boolean;
  email?: string;
  verificationType?: string;
  error?: string;
} {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  // Check if we have required parameters
  if (!email || !verificationType || !timestamp) {
    return {
      valid: false,
      error: "Missing required verification parameters",
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      error: "Invalid email format",
    };
  }

  // Check verification type matches expected
  if (verificationType !== expectedType) {
    return {
      valid: false,
      error: "Verification type mismatch",
    };
  }

  // Check timestamp is within acceptable range
  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum) || now - timestampNum > maxAge) {
    return {
      valid: false,
      error: "Verification link expired",
    };
  }

  return {
    valid: true,
    email,
    verificationType,
  };
}
