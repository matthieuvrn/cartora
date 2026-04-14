import type { RateLimiter } from "@/application/ports/RateLimiter";
import { InMemoryRateLimiter } from "./InMemoryRateLimiter";
import { UpstashRateLimiter } from "./UpstashRateLimiter";

export type RateLimiterConfig = {
  limit: number;
  windowSeconds: number;
  prefix: string;
};

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    return new UpstashRateLimiter({
      url,
      token,
      limit: config.limit,
      windowSeconds: config.windowSeconds,
      prefix: config.prefix,
    });
  }

  return new InMemoryRateLimiter(config.limit, config.windowSeconds * 1000);
}
