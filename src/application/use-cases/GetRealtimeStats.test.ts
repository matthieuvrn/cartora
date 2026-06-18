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

  it("builds hourly distribution bucketed in Europe/Paris (not UTC)", async () => {
    const uc = new GetRealtimeStats(defaultAnalyticsRepo(), createMockClock());
    const result = await uc.execute({ restaurantId: "resto-1" });
    expect(result.hourlyDistribution).toHaveLength(24);
    // Le 28 mars 2026, Paris est en UTC+1 (bascule été le 29) → +1h vs UTC :
    // 10:00/10:30 UTC → 11h, 18:00 UTC → 19h, 14:00/14:20 UTC → 15h.
    expect(result.hourlyDistribution[11]).toEqual({ hour: 11, count: 2 });
    expect(result.hourlyDistribution[19]).toEqual({ hour: 19, count: 1 });
    expect(result.hourlyDistribution[15]).toEqual({ hour: 15, count: 2 });
    // les heures UTC brutes ne doivent plus contenir d'événements
    expect(result.hourlyDistribution[10]).toEqual({ hour: 10, count: 0 });
    expect(result.hourlyDistribution[0]).toEqual({ hour: 0, count: 0 });
  });

  it("identifies peak hour in Paris time", async () => {
    const uc = new GetRealtimeStats(defaultAnalyticsRepo(), createMockClock());
    const result = await uc.execute({ restaurantId: "resto-1" });
    // heures Paris 11 et 15 ont chacune 2 événements ; le pic est la première rencontrée (11)
    expect(result.peakHour).toBe(11);
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
