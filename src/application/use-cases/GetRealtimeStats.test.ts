import { describe, it, expect, vi } from "vitest";
import { GetRealtimeStats } from "./GetRealtimeStats";
import { createMockAnalyticsRepo } from "./__fixtures__/analyticsRepoMock";
import type { Clock } from "@/application/ports/Clock";

const NOW = "2026-03-28T14:30:00.000Z";

const EVENTS_FIXTURE: { createdAt: Date }[] = [
  // 5 days ago, 10:00 UTC
  { createdAt: new Date("2026-03-23T10:00:00.000Z") },
  // 5 days ago, 10:30 UTC
  { createdAt: new Date("2026-03-23T10:30:00.000Z") },
  // 1 day ago, 18:00 UTC (within 24h)
  { createdAt: new Date("2026-03-27T18:00:00.000Z") },
  // 30 min ago (within 60min AND 24h)
  { createdAt: new Date("2026-03-28T14:00:00.000Z") },
  // 10 min ago (within 60min AND 24h)
  { createdAt: new Date("2026-03-28T14:20:00.000Z") },
];

const defaultAnalyticsRepo = () =>
  createMockAnalyticsRepo({ getEventTimestamps: vi.fn(async () => EVENTS_FIXTURE) });

function createMockClock(iso = NOW): Clock {
  return { nowISO: () => iso };
}

describe("GetRealtimeStats", () => {
  it("counts views in last 60 minutes", async () => {
    const uc = new GetRealtimeStats(defaultAnalyticsRepo(), createMockClock());
    const result = await uc.execute({ restaurantId: "resto-1" });
    expect(result.viewsLast60Min).toBe(2);
  });

  it("counts views in last 24 hours", async () => {
    const uc = new GetRealtimeStats(defaultAnalyticsRepo(), createMockClock());
    const result = await uc.execute({ restaurantId: "resto-1" });
    expect(result.viewsLast24h).toBe(3);
  });

  it("builds hourly distribution with 24 entries", async () => {
    const uc = new GetRealtimeStats(defaultAnalyticsRepo(), createMockClock());
    const result = await uc.execute({ restaurantId: "resto-1" });
    expect(result.hourlyDistribution).toHaveLength(24);
    // hour 10 has 2 events, hour 18 has 1, hour 14 has 2
    expect(result.hourlyDistribution[10]).toEqual({ hour: 10, count: 2 });
    expect(result.hourlyDistribution[18]).toEqual({ hour: 18, count: 1 });
    expect(result.hourlyDistribution[14]).toEqual({ hour: 14, count: 2 });
    // hour 0 has 0 events
    expect(result.hourlyDistribution[0]).toEqual({ hour: 0, count: 0 });
  });

  it("identifies peak hour", async () => {
    const uc = new GetRealtimeStats(defaultAnalyticsRepo(), createMockClock());
    const result = await uc.execute({ restaurantId: "resto-1" });
    // hours 10 and 14 both have 2 events; peak is the first one encountered (10)
    expect(result.peakHour).toBe(10);
  });

  it("calls getEventTimestamps with 7-day window", async () => {
    const repo = defaultAnalyticsRepo();
    const uc = new GetRealtimeStats(repo, createMockClock());
    await uc.execute({ restaurantId: "resto-1" });

    expect(repo.getEventTimestamps).toHaveBeenCalledWith(
      "resto-1",
      new Date("2026-03-21T14:30:00.000Z"),
    );
  });

  it("returns null peakHour when no events", async () => {
    const uc = new GetRealtimeStats(createMockAnalyticsRepo(), createMockClock());
    const result = await uc.execute({ restaurantId: "resto-1" });

    expect(result.viewsLast60Min).toBe(0);
    expect(result.viewsLast24h).toBe(0);
    expect(result.peakHour).toBeNull();
    expect(result.hourlyDistribution.every((h) => h.count === 0)).toBe(true);
  });
});
