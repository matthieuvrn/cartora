import type { PrismaClient } from "@/generated/prisma/client";
import type {
  ExportedTexts,
  UserDataExport,
  UserDataRepository,
} from "@/application/ports/UserDataRepository";

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
        dailyDishes: { orderBy: { order: "asc" } },
        formulas: { orderBy: { order: "asc" } },
        billing: true,
      },
    });

    const translations = await this.prisma.translation.findMany({
      where: { restaurantId },
    });

    // Index (entityType, entityId) → locale (minuscules) → field → value. Couvre toutes
    // les langues et TOUS les types d'entités (RGPD : on exporte l'intégralité du contenu
    // saisi par l'utilisateur — items, catégories, plats du jour, formules).
    const textsByEntity = new Map<string, ExportedTexts>();
    for (const t of translations) {
      if (t.field !== "name" && t.field !== "description") continue;
      const key = `${t.entityType}:${t.entityId}`;
      const locale = t.locale.toLowerCase();
      let byLocale = textsByEntity.get(key);
      if (!byLocale) {
        byLocale = {};
        textsByEntity.set(key, byLocale);
      }
      const slot = (byLocale[locale] ??= { name: "", description: "" });
      if (t.field === "name") slot.name = t.value;
      else slot.description = t.value;
    }

    const textsFor = (entityType: string, entityId: string): ExportedTexts =>
      textsByEntity.get(`${entityType}:${entityId}`) ?? {};

    // Nom de catégorie : la source vit sur `categories.name`, seules les langues cibles
    // sont en table translations (field name uniquement).
    const categoryNameTranslations = (categoryId: string): Record<string, string> => {
      const out: Record<string, string> = {};
      for (const [locale, slot] of Object.entries(textsFor("CATEGORY", categoryId))) {
        if (slot.name) out[locale] = slot.name;
      }
      return out;
    };

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
        planTier: restaurant.planTier,
        restaurantType: restaurant.restaurantType ?? null,
        createdAt: restaurant.createdAt.toISOString(),
        sourceLocale: restaurant.sourceLocale,
        menuLocales: restaurant.menuLocales,
        logoPath: restaurant.logoPath ?? null,
        brandColors: {
          primary: restaurant.brandPrimary ?? null,
          accent: restaurant.brandAccent ?? null,
          background: restaurant.brandBackground ?? null,
        },
        qrStyle: restaurant.qrStyle ?? null,
      },
      menu: {
        status: restaurant.menu?.status ?? "DRAFT",
        template: restaurant.menu?.template ?? "CLASSIC",
        publishedAt: restaurant.menu?.publishedAt?.toISOString() ?? null,
        categories: restaurant.categories.map((cat) => ({
          name: cat.name,
          nameTranslations: categoryNameTranslations(cat.id),
          items: cat.items.map((item) => ({
            texts: textsFor("ITEM", item.id),
            priceCents: item.priceCents,
            badge: item.badge,
            allergens: item.allergens,
            isAvailable: item.isAvailable,
          })),
        })),
        dailyDishes: restaurant.dailyDishes.map((dish) => ({
          texts: textsFor("DAILY_DISH", dish.id),
          priceCents: dish.priceCents,
          badge: dish.badge,
          allergens: dish.allergens,
          validUntil: dish.validUntil.toISOString(),
        })),
        formulas: restaurant.formulas.map((formula) => ({
          texts: textsFor("FORMULA", formula.id),
          priceCents: formula.priceCents,
          validUntil: formula.validUntil.toISOString(),
        })),
      },
      billing: restaurant.billing
        ? {
            hasSubscription: restaurant.billing.stripeSubscriptionId !== null,
            stripeCustomerId: restaurant.billing.stripeCustomerId,
            stripeSubscriptionId: restaurant.billing.stripeSubscriptionId,
          }
        : null,
      analytics: {
        totalViews: totalViews._sum.viewCount ?? 0,
        oldestDataDate: oldestStat?.date.toISOString().slice(0, 10) ?? null,
      },
    };
  }
}
