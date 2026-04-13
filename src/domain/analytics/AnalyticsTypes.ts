export type DeviceType = "MOBILE" | "DESKTOP" | "TABLET";
export type ViewSource = "QR" | "DIRECT" | "LINK";

export interface DailyStatRow {
  date: string; // ISO date "YYYY-MM-DD"
  locale: string;
  deviceType: DeviceType;
  source: ViewSource;
  viewCount: number;
}

export interface DashboardStats {
  totalViews: number;
  viewsByDay: { date: string; count: number }[];
  byLocale: Record<string, number>;
  byDevice: Record<DeviceType, number>;
  bySource: Record<ViewSource, number>;
}

export interface HourlyCount {
  hour: number; // 0-23
  count: number;
}

export interface RealtimeStats {
  viewsLast60Min: number;
  viewsLast24h: number;
  hourlyDistribution: HourlyCount[]; // 24 entries, aggregated over last 7 days
  peakHour: number | null; // 0-23
}
