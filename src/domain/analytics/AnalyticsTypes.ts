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
