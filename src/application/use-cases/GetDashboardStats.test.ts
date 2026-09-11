import { describe, it, expect, vi } from "vitest";
import { GetDashboardStats } from "./GetDashboardStats";
import { createMockAnalyticsRepo } from "./__fixtures__/analyticsRepoMock";
import type { Clock } from "@/application/ports/Clock";
import type { DailyStatRow } from "@/domain/analytics/AnalyticsTypes";

const ROWS_FIXTURE: DailyStatRow[] = [
  // Hors des deux fenêtres 7 j, mais dans la fenêtre 30 j.
  { date: "2026-03-02", locale: "fr", deviceType: "DESKTOP", source: "DIRECT", viewCount: 20 },
  // Fenêtre 7 j PRÉCÉDENTE (2026-03-15 → 2026-03-21) : 5 vues.
  { date: "2026-03-18", locale: "fr", deviceType: "MOBILE", source: "QR", viewCount: 4 },
  { date: "2026-03-21", locale: "en", deviceType: "DESKTOP", source: "LINK", viewCount: 1 },
  // Fenêtre 7 j COURANTE (2026-03-22 → 2026-03-28) : 25 vues.
  { date: "2026-03-23", locale: "fr", deviceType: "MOBILE", source: "QR", viewCount: 10 },
  { date: "2026-03-23", locale: "en", deviceType: "DESKTOP", source: "DIRECT", viewCount: 3 },
  { date: "2026-03-25", locale: "fr", deviceType: "TABLET", source: "LINK", viewCount: 5 },
  { date: "2026-03-28", locale: "fr", deviceType: "MOBILE", source: "QR", viewCount: 7 },
];

/** Mock fidèle au repo réel : il FILTRE par bornes, ce qui rend les deux lectures distinctes. */
const defaultAnalyticsRepo = () =>
  createMockAnalyticsRepo({
    getDailyStats: vi.fn(async (_restaurantId: string, from: string, to: string) =>
      ROWS_FIXTURE.filter((row) => row.date >= from && row.date <= to),
    ),
  });

/** Mock à file d'attente : 1re lecture = fenêtre courante, 2e = fenêtre précédente. */
function queuedAnalyticsRepo(current: DailyStatRow[], previous: DailyStatRow[]) {
  const queue = [current, previous];
  return createMockAnalyticsRepo({ getDailyStats: vi.fn(async () => queue.shift() ?? []) });
}

function createMockClock(iso = "2026-03-28T14:00:00.000Z"): Clock {
  return { nowISO: () => iso };
}

/** Série jour par jour attendue, reconstruite à partir des seules dates non nulles. */
function expectedViewsByDay(from: string, days: number, counts: Record<string, number>) {
  const series: { date: string; count: number }[] = [];
  const cursor = new Date(from + "T00:00:00Z");
  for (let i = 0; i < days; i += 1) {
    const date = cursor.toISOString().slice(0, 10);
    series.push({ date, count: counts[date] ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
}

describe("GetDashboardStats", () => {
  it("returns aggregated stats for 7-day window", async () => {
    const uc = new GetDashboardStats(defaultAnalyticsRepo(), createMockClock());

    const result = await uc.execute({ restaurantId: "resto-1" });

    expect(result).toEqual({
      totalViews: 25,
      viewsByDay: [
        { date: "2026-03-22", count: 0 },
        { date: "2026-03-23", count: 13 },
        { date: "2026-03-24", count: 0 },
        { date: "2026-03-25", count: 5 },
        { date: "2026-03-26", count: 0 },
        { date: "2026-03-27", count: 0 },
        { date: "2026-03-28", count: 7 },
      ],
      byLocale: { fr: 22, en: 3 },
      byDevice: { MOBILE: 17, DESKTOP: 3, TABLET: 5 },
      bySource: { QR: 17, DIRECT: 3, LINK: 5 },
      period: 7,
      previousTotalViews: 5,
      viewsDelta: { kind: "up", pct: 400 },
    });
  });

  it("reads the current and the previous 7-day windows", async () => {
    const analyticsRepo = defaultAnalyticsRepo();
    const uc = new GetDashboardStats(analyticsRepo, createMockClock());

    await uc.execute({ restaurantId: "resto-1" });

    expect(analyticsRepo.getDailyStats).toHaveBeenCalledWith("resto-1", "2026-03-22", "2026-03-28");
    expect(analyticsRepo.getDailyStats).toHaveBeenCalledTimes(2);
    expect(analyticsRepo.getDailyStats).toHaveBeenNthCalledWith(
      1,
      "resto-1",
      "2026-03-22",
      "2026-03-28",
    );
    expect(analyticsRepo.getDailyStats).toHaveBeenNthCalledWith(
      2,
      "resto-1",
      "2026-03-15",
      "2026-03-21",
    );
  });

  it("bounds the window on the Paris calendar day, not the UTC day", async () => {
    // 23:30 UTC le 28 mars = 00:30 Paris le 29 mars (CET) : la borne haute doit
    // être le jour Paris (même référentiel que l'écriture des agrégats).
    const analyticsRepo = defaultAnalyticsRepo();
    const uc = new GetDashboardStats(analyticsRepo, createMockClock("2026-03-28T23:30:00.000Z"));

    await uc.execute({ restaurantId: "resto-1" });

    expect(analyticsRepo.getDailyStats).toHaveBeenCalledWith("resto-1", "2026-03-23", "2026-03-29");
    expect(analyticsRepo.getDailyStats).toHaveBeenNthCalledWith(
      2,
      "resto-1",
      "2026-03-16",
      "2026-03-22",
    );
  });

  it("reads a 30-day window and the previous 30 days", async () => {
    const analyticsRepo = defaultAnalyticsRepo();
    const uc = new GetDashboardStats(analyticsRepo, createMockClock());

    const result = await uc.execute({ restaurantId: "resto-1", period: 30 });

    expect(analyticsRepo.getDailyStats).toHaveBeenNthCalledWith(
      1,
      "resto-1",
      "2026-02-27",
      "2026-03-28",
    );
    expect(analyticsRepo.getDailyStats).toHaveBeenNthCalledWith(
      2,
      "resto-1",
      "2026-01-28",
      "2026-02-26",
    );
    expect(result).toEqual({
      totalViews: 50,
      viewsByDay: expectedViewsByDay("2026-02-27", 30, {
        "2026-03-02": 20,
        "2026-03-18": 4,
        "2026-03-21": 1,
        "2026-03-23": 13,
        "2026-03-25": 5,
        "2026-03-28": 7,
      }),
      byLocale: { fr: 46, en: 4 },
      byDevice: { MOBILE: 21, DESKTOP: 24, TABLET: 5 },
      bySource: { QR: 21, DIRECT: 23, LINK: 6 },
      period: 30,
      previousTotalViews: 0,
      viewsDelta: { kind: "new" },
    });
    expect(result.viewsByDay).toHaveLength(30);
    expect(result.viewsByDay[0]).toEqual({ date: "2026-02-27", count: 0 });
    expect(result.viewsByDay[29]).toEqual({ date: "2026-03-28", count: 7 });
  });

  it("flags a drop vs the previous window", async () => {
    const analyticsRepo = queuedAnalyticsRepo(
      [{ date: "2026-03-28", locale: "fr", deviceType: "MOBILE", source: "QR", viewCount: 2 }],
      [{ date: "2026-03-18", locale: "fr", deviceType: "MOBILE", source: "QR", viewCount: 8 }],
    );
    const uc = new GetDashboardStats(analyticsRepo, createMockClock());

    const result = await uc.execute({ restaurantId: "resto-1" });

    expect(result).toEqual({
      totalViews: 2,
      viewsByDay: expectedViewsByDay("2026-03-22", 7, { "2026-03-28": 2 }),
      byLocale: { fr: 2 },
      byDevice: { MOBILE: 2, DESKTOP: 0, TABLET: 0 },
      bySource: { QR: 2, DIRECT: 0, LINK: 0 },
      period: 7,
      previousTotalViews: 8,
      viewsDelta: { kind: "down", pct: -75 },
    });
  });

  it("defaults the period to 7 days when omitted", async () => {
    const analyticsRepo = defaultAnalyticsRepo();
    const uc = new GetDashboardStats(analyticsRepo, createMockClock());

    const result = await uc.execute({ restaurantId: "resto-1" });

    expect(result.period).toBe(7);
    expect(result.viewsByDay).toHaveLength(7);
    expect(analyticsRepo.getDailyStats).toHaveBeenCalledTimes(2);
  });

  it("returns zero stats when no rows", async () => {
    const uc = new GetDashboardStats(createMockAnalyticsRepo(), createMockClock());

    const result = await uc.execute({ restaurantId: "resto-1" });

    expect(result).toEqual({
      totalViews: 0,
      viewsByDay: expectedViewsByDay("2026-03-22", 7, {}),
      byLocale: {},
      byDevice: { MOBILE: 0, DESKTOP: 0, TABLET: 0 },
      bySource: { QR: 0, DIRECT: 0, LINK: 0 },
      period: 7,
      previousTotalViews: 0,
      viewsDelta: { kind: "none" },
    });
  });
});
