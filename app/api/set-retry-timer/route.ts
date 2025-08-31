// app/api/set-retry-timer/route.ts
import { NextResponse } from "next/server";

import { redisClient } from "@/lib/redis";

export async function POST(request: Request) {
  const { type, email, seconds } = (await request.json()) as {
    type: "otp" | "email";
    email: string;
    seconds: number;
  };

  if (!email || !type || typeof seconds !== "number") {
    return NextResponse.json(
      { success: false, message: "Bad payload" },
      { status: 400 }
    );
  }

  const key = `${type}:${email}`;
  await redisClient.setEx(key, seconds, "pending");
  return NextResponse.json({ success: true });
}
