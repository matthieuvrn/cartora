export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export interface RateLimiter {
  check(identifier: string): Promise<RateLimitResult>;
}
