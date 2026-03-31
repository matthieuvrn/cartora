import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";

export interface SnapshotRepository {
  upsertSnapshot(params: {
    menuId: string;
    restaurantId: string;
    slug: string;
    snapshotData: PublicMenuSnapshot;
    publishedAt: string;
  }): Promise<void>;

  getSnapshotBySlug(
    slug: string,
  ): Promise<{ snapshotData: PublicMenuSnapshot; publishedAt: string; planStatus: PlanStatus } | null>;
}
