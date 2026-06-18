import type { AnalyticsRepository } from "@/application/ports/AnalyticsRepository";
import type { Clock } from "@/application/ports/Clock";
import type { RealtimeStats } from "@/domain/analytics/AnalyticsTypes";
import { hourInAppTimeZone } from "@/domain/time/appTimeZone";

export type GetRealtimeStatsInput = {
  restaurantId: string;
};

export type GetRealtimeStatsOutput = RealtimeStats;

export class GetRealtimeStats {
  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: GetRealtimeStatsInput): Promise<GetRealtimeStatsOutput> {
    const now = new Date(this.clock.nowISO());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sixtyMinAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const events = await this.analyticsRepo.getEventTimestamps(input.restaurantId, sevenDaysAgo);

    let viewsLast60Min = 0;
    let viewsLast24h = 0;
    const hourlyCounts = new Array<number>(24).fill(0);

    for (const event of events) {
      const t = event.createdAt.getTime();
      if (t >= sixtyMinAgo.getTime()) viewsLast60Min++;
      if (t >= twentyFourHoursAgo.getTime()) viewsLast24h++;
      hourlyCounts[hourInAppTimeZone(event.createdAt)]++;
    }

    const hourlyDistribution = hourlyCounts.map((count, hour) => ({ hour, count }));

    let peakHour: number | null = null;
    let maxCount = 0;
    for (const { hour, count } of hourlyDistribution) {
      if (count > maxCount) {
        peakHour = hour;
        maxCount = count;
      }
    }

    return { viewsLast60Min, viewsLast24h, hourlyDistribution, peakHour };
  }
}
