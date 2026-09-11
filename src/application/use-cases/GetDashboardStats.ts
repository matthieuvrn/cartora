import type { AnalyticsRepository } from "@/application/ports/AnalyticsRepository";
import type { Clock } from "@/application/ports/Clock";
import { AnalyticsPolicy } from "@/domain/analytics/AnalyticsPolicy";
import {
  DEFAULT_STATS_PERIOD,
  type DailyStatRow,
  type DashboardStats,
  type DeviceType,
  type StatsPeriod,
  type ViewSource,
} from "@/domain/analytics/AnalyticsTypes";
import { appCalendarDayISO } from "@/domain/time/appTimeZone";

export type GetDashboardStatsInput = {
  restaurantId: string;
  /** Fenêtre demandée (7 ou 30 jours) — déjà validée par `AnalyticsPolicy.parseStatsPeriod`. */
  period?: StatsPeriod;
};

export type GetDashboardStatsOutput = DashboardStats;

export class GetDashboardStats {
  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: GetDashboardStatsInput): Promise<GetDashboardStatsOutput> {
    const period = input.period ?? DEFAULT_STATS_PERIOD;
    // Jour calendaire Europe/Paris, PAS UTC : l'écriture bucketise en jour Paris
    // (PrismaAnalyticsRepository.recordView) — une borne UTC exclurait les vues
    // entre minuit Paris et minuit UTC, pile après le service du soir.
    const today = appCalendarDayISO(new Date(this.clock.nowISO()));
    const from = subtractDays(today, period - 1);

    // Période précédente de MÊME longueur (7 vs 7, 30 vs 30) : seule comparaison honnête.
    // Elle est relue en entier plutôt qu'agrégée par le port — choix assumé : pas de méthode
    // supplémentaire sur `AnalyticsRepository`, et l'index (restaurant_id, date) rend ce second
    // appel négligeable.
    const previousTo = subtractDays(from, 1);
    const previousFrom = subtractDays(from, period);

    const [rows, previousRows] = await Promise.all([
      this.analyticsRepo.getDailyStats(input.restaurantId, from, today),
      this.analyticsRepo.getDailyStats(input.restaurantId, previousFrom, previousTo),
    ]);

    const current = aggregate(rows, from, today);
    const previousTotalViews = previousRows.reduce((sum, row) => sum + row.viewCount, 0);

    return {
      ...current,
      period,
      previousTotalViews,
      viewsDelta: AnalyticsPolicy.computeViewsDelta(current.totalViews, previousTotalViews),
    };
  }
}

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function aggregate(
  rows: DailyStatRow[],
  from: string,
  to: string,
): Omit<DashboardStats, "period" | "previousTotalViews" | "viewsDelta"> {
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
