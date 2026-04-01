import type { SnapshotRepository } from "@/application/ports/SnapshotRepository";
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { PrismaClient, Prisma } from "@/generated/prisma/client";

export class PrismaSnapshotRepository implements SnapshotRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsertSnapshot(params: {
    menuId: string;
    restaurantId: string;
    slug: string;
    snapshotData: PublicMenuSnapshot;
    publishedAt: string;
  }): Promise<void> {
    await this.db.menuPublicSnapshot.upsert({
      where: { restaurantId: params.restaurantId },
      update: {
        menuId: params.menuId,
        slug: params.slug,
        snapshotData: params.snapshotData as unknown as Prisma.InputJsonValue,
        publishedAt: new Date(params.publishedAt),
      },
      create: {
        menuId: params.menuId,
        restaurantId: params.restaurantId,
        slug: params.slug,
        snapshotData: params.snapshotData as unknown as Prisma.InputJsonValue,
        publishedAt: new Date(params.publishedAt),
      },
    });
  }

  async getSnapshotBySlug(slug: string): Promise<{
    restaurantId: string;
    snapshotData: PublicMenuSnapshot;
    publishedAt: string;
    planStatus: PlanStatus;
  } | null> {
    const row = await this.db.menuPublicSnapshot.findUnique({
      where: { slug },
      select: {
        restaurantId: true,
        snapshotData: true,
        publishedAt: true,
        restaurant: { select: { planStatus: true } },
      },
    });

    if (!row || !row.publishedAt) return null;

    return {
      restaurantId: row.restaurantId,
      snapshotData: row.snapshotData as unknown as PublicMenuSnapshot,
      publishedAt: row.publishedAt.toISOString(),
      planStatus: row.restaurant.planStatus as PlanStatus,
    };
  }
}
