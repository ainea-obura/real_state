// lib/redis.ts
import { createClient } from 'redis';

declare global {
  // avoid reconnect storms in dev/reload
  // eslint-disable-next-line no-var
  var __redisClient: ReturnType<typeof createClient> | undefined;
}

if (!global.__redisClient) {
  // first time: create _and_ connect
  const client = createClient({
    socket: {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
    },
  });
  client.connect().catch(console.error);
  global.__redisClient = client;
}

export const redisClient = global.__redisClient!;
