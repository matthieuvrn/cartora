import type { RateLimiter, RateLimitResult } from "@/application/ports/RateLimiter";

type Entry = { count: number; resetAt: number };

export class InMemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, Entry>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  async check(identifier: string): Promise<RateLimitResult> {
    const now = this.now();
    const entry = this.hits.get(identifier);

    if (!entry || now > entry.resetAt) {
      const resetAt = now + this.windowMs;
      this.hits.set(identifier, { count: 1, resetAt });
      return { success: true, limit: this.limit, remaining: this.limit - 1, resetAt };
    }

    entry.count++;
    const remaining = Math.max(0, this.limit - entry.count);
    return {
      success: entry.count <= this.limit,
      limit: this.limit,
      remaining,
      resetAt: entry.resetAt,
    };
  }

  cleanup(): void {
    const now = this.now();
    for (const [key, entry] of this.hits) {
      if (now > entry.resetAt) this.hits.delete(key);
    }
  }
}
