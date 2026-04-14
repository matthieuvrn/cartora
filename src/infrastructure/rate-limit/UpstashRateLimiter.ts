import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { RateLimiter, RateLimitResult } from "@/application/ports/RateLimiter";

export class UpstashRateLimiter implements RateLimiter {
  private readonly ratelimit: Ratelimit;

  constructor(opts: {
    url: string;
    token: string;
    limit: number;
    windowSeconds: number;
    prefix: string;
  }) {
    const redis = new Redis({ url: opts.url, token: opts.token });
    this.ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(opts.limit, `${opts.windowSeconds} s`),
      prefix: opts.prefix,
      analytics: false,
    });
  }

  async check(identifier: string): Promise<RateLimitResult> {
    const result = await this.ratelimit.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.reset,
    };
  }
}
