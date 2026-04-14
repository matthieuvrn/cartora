import { describe, expect, it } from "vitest";
import { InMemoryRateLimiter } from "./InMemoryRateLimiter";

function makeClock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("InMemoryRateLimiter", () => {
  it("allows up to limit requests within the window", async () => {
    const clock = makeClock();
    const limiter = new InMemoryRateLimiter(15, 60_000, clock.now);

    for (let i = 1; i <= 15; i++) {
      const res = await limiter.check("1.1.1.1");
      expect(res.success).toBe(true);
      expect(res.remaining).toBe(15 - i);
    }
  });

  it("blocks the 16th request within the window", async () => {
    const clock = makeClock();
    const limiter = new InMemoryRateLimiter(15, 60_000, clock.now);

    for (let i = 0; i < 15; i++) await limiter.check("1.1.1.1");
    const blocked = await limiter.check("1.1.1.1");

    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after the window expires", async () => {
    const clock = makeClock();
    const limiter = new InMemoryRateLimiter(15, 60_000, clock.now);

    for (let i = 0; i < 15; i++) await limiter.check("1.1.1.1");
    expect((await limiter.check("1.1.1.1")).success).toBe(false);

    clock.advance(60_001);

    const afterReset = await limiter.check("1.1.1.1");
    expect(afterReset.success).toBe(true);
    expect(afterReset.remaining).toBe(14);
  });

  it("tracks different identifiers independently", async () => {
    const clock = makeClock();
    const limiter = new InMemoryRateLimiter(2, 60_000, clock.now);

    await limiter.check("a");
    await limiter.check("a");
    expect((await limiter.check("a")).success).toBe(false);

    const b = await limiter.check("b");
    expect(b.success).toBe(true);
    expect(b.remaining).toBe(1);
  });
});
