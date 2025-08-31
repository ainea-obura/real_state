// app/api/get-remaining-time/route.ts

import { NextResponse } from "next/server";

import { redisClient } from "@/lib/redis";

export async function POST(req: Request) {
  // Parse the request body
  const { email, type } = await req.json();

  if (!email || !type) {
    return NextResponse.json(
      { error: "Email or type missing" },
      { status: 400 }
    );
  }

  // Generate the Redis key based on email and type (either OTP or Email)
  const key = `${type}:${email}`;
  try {
    // Fetch TTL (Time To Live) for the given Redis key
    const ttl = await redisClient.ttl(key);

    // If the TTL is less than or equal to 0, it means either the key has expired or doesn’t exist
    if (ttl <= 0) {
      return NextResponse.json({ remaining: 0 });
    }

    // Return the remaining time (TTL in seconds)
    return NextResponse.json({ remaining: ttl });
  } catch (err) {
    
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
