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

    // RGPD anonymisation: the parsed `deviceType` already captures everything
    // we need from the UA — we never persist the full string. Likewise we
    // collapse `referer` down to its hostname so an opaque query/path can't
    // smuggle PII into our analytics table.
    await this.repo.record({
      eventName: input.eventName,
      locale: input.locale ?? "fr",
      deviceType,
      source,
      metadata: input.metadata ?? null,
      userAgent: null,
      referer: AnalyticsPolicy.sanitizeRefererToHost(input.referer),
    });

    return { recorded: true };
  }
}
