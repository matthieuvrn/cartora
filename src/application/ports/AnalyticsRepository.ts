import type { DailyStatRow, DeviceType, ViewSource } from "@/domain/analytics/AnalyticsTypes";

export interface AnalyticsRepository {
  recordView(event: {
    restaurantId: string;
    slug: string;
    locale: string;
    deviceType: DeviceType;
    source: ViewSource;
  }): Promise<void>;

  getDailyStats(restaurantId: string, from: string, to: string): Promise<DailyStatRow[]>;

  getEventTimestamps(restaurantId: string, since: Date): Promise<{ createdAt: Date }[]>;
}
