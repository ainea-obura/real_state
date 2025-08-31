// app/api/clear-verify-cookie/route.ts
// ⚠️ DEPRECATED: This API is no longer used.
// The authentication system now uses URL parameters instead of cookies.
// This file is kept for backward compatibility but will be removed in a future update.

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.warn(
    "[DEPRECATED] clear-verify-cookie API called - this endpoint is deprecated"
  );

  return NextResponse.json(
    {
      ok: true,
      message:
        "This API endpoint is deprecated. No action needed as cookies are no longer used.",
    },
    { status: 200 }
  );
}
