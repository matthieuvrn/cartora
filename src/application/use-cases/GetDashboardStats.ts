import type { AnalyticsRepository } from "@/application/ports/AnalyticsRepository";
import type { Clock } from "@/application/ports/Clock";
import type {
  DailyStatRow,
  DashboardStats,
  DeviceType,
  ViewSource,
} from "@/domain/analytics/AnalyticsTypes";

export type GetDashboardStatsInput = {
  restaurantId: string;
};

export type GetDashboardStatsOutput = DashboardStats;

export class GetDashboardStats {
  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: GetDashboardStatsInput): Promise<GetDashboardStatsOutput> {
    const today = this.clock.nowISO().slice(0, 10);
    const from = subtractDays(today, 6);

    const rows = await this.analyticsRepo.getDailyStats(input.restaurantId, from, today);

    return aggregate(rows, from, today);
  }
}

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function aggregate(rows: DailyStatRow[], from: string, to: string): DashboardStats {
  const dates: string[] = [];
  const d = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (d <= end) {
    dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }

  let totalViews = 0;
  const dayMap: Record<string, number> = {};
  for (const date of dates) dayMap[date] = 0;

  const byLocale: Record<string, number> = {};
  const byDevice: Record<DeviceType, number> = { MOBILE: 0, DESKTOP: 0, TABLET: 0 };
  const bySource: Record<ViewSource, number> = { QR: 0, DIRECT: 0, LINK: 0 };

  for (const row of rows) {
    totalViews += row.viewCount;
    dayMap[row.date] = (dayMap[row.date] ?? 0) + row.viewCount;
    byLocale[row.locale] = (byLocale[row.locale] ?? 0) + row.viewCount;
    byDevice[row.deviceType] += row.viewCount;
    bySource[row.source] += row.viewCount;
  }

  const viewsByDay = dates.map((date) => ({ date, count: dayMap[date] }));

  return { totalViews, viewsByDay, byLocale, byDevice, bySource };
}
