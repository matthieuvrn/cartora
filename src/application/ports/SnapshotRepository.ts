import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { PlanTier } from "@/domain/billing/PlanPolicy";

export interface SnapshotRepository {
  upsertSnapshot(params: {
    menuId: string;
    restaurantId: string;
    slug: string;
    snapshotData: PublicMenuSnapshot;
    publishedAt: string;
  }): Promise<void>;

  getSnapshotBySlug(slug: string): Promise<{
    restaurantId: string;
    snapshotData: PublicMenuSnapshot;
    publishedAt: string;
    planStatus: PlanStatus;
    planTier: PlanTier;
  } | null>;

  listPublished(): Promise<Array<{ slug: string; publishedAt: string }>>;
}
