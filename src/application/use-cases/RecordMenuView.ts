import type { AnalyticsRepository } from "@/application/ports/AnalyticsRepository";
import type { SnapshotRepository } from "@/application/ports/SnapshotRepository";
import { AnalyticsPolicy } from "@/domain/analytics/AnalyticsPolicy";

export type RecordMenuViewInput = {
  slug: string;
  userAgent: string;
  locale: string;
  utmSource?: string;
  referrer?: string;
};

export type RecordMenuViewOutput = {
  recorded: boolean;
};

export class RecordMenuView {
  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly snapshotRepo: SnapshotRepository,
  ) {}

  async execute(input: RecordMenuViewInput): Promise<RecordMenuViewOutput> {
    const snapshot = await this.snapshotRepo.getSnapshotBySlug(input.slug);
    if (!snapshot) return { recorded: false };

    const deviceType = AnalyticsPolicy.parseDeviceType(input.userAgent);
    const source = AnalyticsPolicy.parseViewSource(input.utmSource, input.referrer);

    await this.analyticsRepo.recordView({
      restaurantId: snapshot.restaurantId,
      slug: input.slug,
      locale: input.locale,
      deviceType,
      source,
    });

    return { recorded: true };
  }
}
