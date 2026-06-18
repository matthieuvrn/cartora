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

    // Index entityId → locale (minuscules) → field → value. Couvre toutes les langues
    // (RGPD : on exporte l'intégralité du contenu saisi par l'utilisateur).
    const itemTextsById = new Map<string, Record<string, { name: string; description: string }>>();
    for (const t of translations) {
      if (t.entityType !== "ITEM") continue;
      if (t.field !== "name" && t.field !== "description") continue;
      const locale = t.locale.toLowerCase();
      let byLocale = itemTextsById.get(t.entityId);
      if (!byLocale) {
        byLocale = {};
        itemTextsById.set(t.entityId, byLocale);
      }
      const slot = (byLocale[locale] ??= { name: "", description: "" });
      if (t.field === "name") slot.name = t.value;
      else slot.description = t.value;
    }

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
        sourceLocale: restaurant.sourceLocale,
        menuLocales: restaurant.menuLocales,
      },
      menu: {
        status: restaurant.menu?.status ?? "DRAFT",
        categories: restaurant.categories.map((cat) => ({
          name: cat.name,
          items: cat.items.map((item) => ({
            texts: itemTextsById.get(item.id) ?? {},
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
