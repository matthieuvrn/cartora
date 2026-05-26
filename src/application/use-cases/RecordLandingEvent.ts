import type { LandingEventRepository } from "@/application/ports/LandingEventRepository";
import type { LandingEventName } from "@/domain/analytics/LandingEventNames";
import { AnalyticsPolicy } from "@/domain/analytics/AnalyticsPolicy";

export interface RecordLandingEventInput {
  eventName: LandingEventName;
  locale?: "fr" | "en";
  userAgent: string;
  referer?: string;
  utmSource?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordLandingEventOutput {
  recorded: true;
}

export class RecordLandingEvent {
  constructor(private readonly repo: LandingEventRepository) {}

  async execute(input: RecordLandingEventInput): Promise<RecordLandingEventOutput> {
    const deviceType = AnalyticsPolicy.parseDeviceType(input.userAgent);
    const viewSource = AnalyticsPolicy.parseViewSource(input.utmSource, input.referer);
    const source = viewSource.toLowerCase();

    await this.repo.record({
      eventName: input.eventName,
      locale: input.locale ?? "fr",
      deviceType,
      source,
      metadata: input.metadata ?? null,
      userAgent: input.userAgent.length > 0 ? input.userAgent.slice(0, 500) : null,
      referer: input.referer ? input.referer.slice(0, 500) : null,
    });

    return { recorded: true };
  }
}
