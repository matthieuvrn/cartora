import type { PrismaClient } from "@/generated/prisma/client";
import type { UserDataExport, UserDataRepository } from "@/application/ports/UserDataRepository";

export class PrismaUserDataRepository implements UserDataRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async exportUserData(restaurantId: string, email: string): Promise<UserDataExport> {
    const restaurant = await this.prisma.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      include: {
        menu: true,
        categories: {
          orderBy: { order: "asc" },
          include: {
            items: {
              orderBy: { order: "asc" },
            },
          },
        },
        billing: true,
      },
    });

    const translations = await this.prisma.translation.findMany({
      where: { restaurantId },
    });

    const translationMap = new Map<string, string>();
    for (const t of translations) {
      translationMap.set(`${t.entityId}:${t.field}:${t.locale}`, t.value);
    }

    const getTranslation = (entityId: string, field: string, locale: string): string | null =>
      translationMap.get(`${entityId}:${field}:${locale}`) ?? null;

    const totalViews = await this.prisma.menuViewDailyStat.aggregate({
      where: { restaurantId },
      _sum: { viewCount: true },
    });

    const oldestStat = await this.prisma.menuViewDailyStat.findFirst({
      where: { restaurantId },
      orderBy: { date: "asc" },
      select: { date: true },
    });

    return {
      account: {
        email,
        createdAt: restaurant.createdAt.toISOString(),
      },
      restaurant: {
        displayName: restaurant.displayName,
        slug: restaurant.slug,
        planStatus: restaurant.planStatus,
        createdAt: restaurant.createdAt.toISOString(),
      },
      menu: {
        status: restaurant.menu?.status ?? "DRAFT",
        categories: restaurant.categories.map((cat) => ({
          name: cat.name,
          items: cat.items.map((item) => ({
            nameFr: getTranslation(item.id, "name", "FR"),
            nameEn: getTranslation(item.id, "name", "EN"),
            descriptionFr: getTranslation(item.id, "description", "FR"),
            descriptionEn: getTranslation(item.id, "description", "EN"),
            priceCents: item.priceCents,
            badge: item.badge,
            isAvailable: item.isAvailable,
          })),
        })),
      },
      billing: restaurant.billing
        ? { hasSubscription: restaurant.billing.stripeSubscriptionId !== null }
        : null,
      analytics: {
        totalViews: totalViews._sum.viewCount ?? 0,
        oldestDataDate: oldestStat?.date.toISOString().slice(0, 10) ?? null,
      },
    };
  }
}
