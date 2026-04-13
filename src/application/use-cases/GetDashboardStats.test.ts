import { describe, it, expect, vi } from "vitest";
import { GetDashboardStats } from "./GetDashboardStats";
import type { AnalyticsRepository } from "@/application/ports/AnalyticsRepository";
import type { Clock } from "@/application/ports/Clock";
import type { DailyStatRow } from "@/domain/analytics/AnalyticsTypes";

const ROWS_FIXTURE: DailyStatRow[] = [
  { date: "2026-03-23", locale: "fr", deviceType: "MOBILE", source: "QR", viewCount: 10 },
  { date: "2026-03-23", locale: "en", deviceType: "DESKTOP", source: "DIRECT", viewCount: 3 },
  { date: "2026-03-25", locale: "fr", deviceType: "TABLET", source: "LINK", viewCount: 5 },
  { date: "2026-03-28", locale: "fr", deviceType: "MOBILE", source: "QR", viewCount: 7 },
];

function createMockAnalyticsRepo(
  overrides: Partial<AnalyticsRepository> = {},
): AnalyticsRepository {
  return {
    recordView: vi.fn(async () => {}),
    getDailyStats: vi.fn(async () => ROWS_FIXTURE),
    getEventTimestamps: vi.fn(async () => []),
    ...overrides,
  };
}

function createMockClock(iso = "2026-03-28T14:00:00.000Z"): Clock {
  return { nowISO: () => iso };
}

describe("GetDashboardStats", () => {
  it("returns aggregated stats for 7-day window", async () => {
    const uc = new GetDashboardStats(createMockAnalyticsRepo(), createMockClock());

    const result = await uc.execute({ restaurantId: "resto-1" });

    expect(result.totalViews).toBe(25);
    expect(result.viewsByDay).toHaveLength(7);
    expect(result.viewsByDay[0]).toEqual({ date: "2026-03-22", count: 0 });
    expect(result.viewsByDay[1]).toEqual({ date: "2026-03-23", count: 13 });
    expect(result.viewsByDay[3]).toEqual({ date: "2026-03-25", count: 5 });
    expect(result.viewsByDay[6]).toEqual({ date: "2026-03-28", count: 7 });
    expect(result.byLocale).toEqual({ fr: 22, en: 3 });
    expect(result.byDevice).toEqual({ MOBILE: 17, DESKTOP: 3, TABLET: 5 });
    expect(result.bySource).toEqual({ QR: 17, DIRECT: 3, LINK: 5 });
  });

  it("calls getDailyStats with correct date range", async () => {
    const analyticsRepo = createMockAnalyticsRepo();
    const uc = new GetDashboardStats(analyticsRepo, createMockClock());

    await uc.execute({ restaurantId: "resto-1" });

    expect(analyticsRepo.getDailyStats).toHaveBeenCalledWith("resto-1", "2026-03-22", "2026-03-28");
  });

  it("returns zero stats when no rows", async () => {
    const uc = new GetDashboardStats(
      createMockAnalyticsRepo({ getDailyStats: vi.fn(async () => []) }),
      createMockClock(),
    );

    const result = await uc.execute({ restaurantId: "resto-1" });

    expect(result.totalViews).toBe(0);
    expect(result.viewsByDay.every((d) => d.count === 0)).toBe(true);
    expect(result.byLocale).toEqual({});
    expect(result.byDevice).toEqual({ MOBILE: 0, DESKTOP: 0, TABLET: 0 });
    expect(result.bySource).toEqual({ QR: 0, DIRECT: 0, LINK: 0 });
  });
});
