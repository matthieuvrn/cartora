import type { DeviceType } from "@/domain/analytics/AnalyticsTypes";
import type { LandingEventName } from "@/domain/analytics/LandingEventNames";

export interface RecordLandingEventInput {
  eventName: LandingEventName;
  locale: "fr" | "en";
  deviceType: DeviceType;
  source: string | null;
  metadata: Record<string, unknown> | null;
  userAgent: string | null;
  referer: string | null;
}

export interface LandingEventRepository {
  record(input: RecordLandingEventInput): Promise<void>;
}
