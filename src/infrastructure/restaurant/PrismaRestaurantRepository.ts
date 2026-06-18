import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { InitialCategory, RestaurantType } from "@/domain/restaurant/RestaurantInitPolicy";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import type { MenuLocale } from "@/domain/menu/MenuLocale";
import type { PrismaClient } from "@/generated/prisma/client";

export class PrismaRestaurantRepository implements RestaurantRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByOwnerUserId(ownerUserId: string): Promise<{ id: string } | null> {
    return this.db.restaurant.findUnique({
      where: { ownerUserId },
      select: { id: true },
    });
  }

  async createWithMenuAndCategories(params: {
    ownerUserId: string;
    displayName: string;
    slug: string;
    categories: InitialCategory[];
    restaurantType?: RestaurantType | null;
  }): Promise<{ id: string }> {
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const slug = attempt === 0 ? params.slug : `${params.slug}-${randomSuffix()}`;

      try {
        return await this.db.$transaction(async (tx) => {
          const restaurant = await tx.restaurant.create({
            data: {
              ownerUserId: params.ownerUserId,
              displayName: params.displayName,
              slug,
              restaurantType: params.restaurantType ?? null,
            },
            select: { id: true },
          });

          const menu = await tx.menu.create({
            data: { restaurantId: restaurant.id },
            select: { id: true },
          });

          await tx.category.createMany({
            data: params.categories.map((cat) => ({
              menuId: menu.id,
              restaurantId: restaurant.id,
              name: cat.name,
              order: cat.order,
            })),
          });

          return restaurant;
        });
      } catch (error: unknown) {
        const isUniqueViolation =
          error instanceof Error && error.message.includes("Unique constraint");

        if (isUniqueViolation && attempt < maxRetries) {
          continue;
        }
        throw error;
      }
    }

    throw new Error("Failed to create restaurant after retries");
  }

  async getRestaurantById(id: string): Promise<{
    id: string;
    slug: string;
    displayName: string;
    planStatus: PlanStatus;
    planTier: PlanTier;
    activationDismissedAt: Date | null;
    logoPath: string | null;
    brandPrimary: string | null;
    brandAccent: string | null;
    brandBackground: string | null;
    sourceLocale: MenuLocale;
    menuLocales: MenuLocale[];
  } | null> {
    const restaurant = await this.db.restaurant.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        displayName: true,
        planStatus: true,
        planTier: true,
        activationDismissedAt: true,
        logoPath: true,
        brandPrimary: true,
        brandAccent: true,
        brandBackground: true,
        sourceLocale: true,
        menuLocales: true,
      },
    });

    if (!restaurant) return null;

    return {
      id: restaurant.id,
      slug: restaurant.slug,
      displayName: restaurant.displayName,
      planStatus: restaurant.planStatus as PlanStatus,
      planTier: restaurant.planTier as PlanTier,
      activationDismissedAt: restaurant.activationDismissedAt,
      logoPath: restaurant.logoPath,
      brandPrimary: restaurant.brandPrimary,
      brandAccent: restaurant.brandAccent,
      brandBackground: restaurant.brandBackground,
      // Contraints par CHECK SQL (076) — le cast reflète l'invariant DB.
      sourceLocale: restaurant.sourceLocale as MenuLocale,
      menuLocales: restaurant.menuLocales as MenuLocale[],
    };
  }

  async updateMenuLocales(params: {
    restaurantId: string;
    menuLocales: MenuLocale[];
  }): Promise<void> {
    await this.db.restaurant.update({
      where: { id: params.restaurantId },
      data: { menuLocales: params.menuLocales },
    });
  }
  async updateDisplayName(params: { restaurantId: string; displayName: string }): Promise<void> {
    await this.db.restaurant.update({
      where: { id: params.restaurantId },
      data: { displayName: params.displayName },
    });
  }

  async updateLogoPath(params: { restaurantId: string; logoPath: string | null }): Promise<void> {
    await this.db.restaurant.update({
      where: { id: params.restaurantId },
      data: { logoPath: params.logoPath },
    });
  }

  async updateBrandColors(params: {
    restaurantId: string;
    primary: string | null;
    accent: string | null;
    background: string | null;
  }): Promise<void> {
    await this.db.restaurant.update({
      where: { id: params.restaurantId },
      data: {
        brandPrimary: params.primary,
        brandAccent: params.accent,
        brandBackground: params.background,
      },
    });
  }

  async markActivationDismissed(restaurantId: string): Promise<void> {
    await this.db.restaurant.update({
      where: { id: restaurantId },
      data: { activationDismissedAt: new Date() },
    });
  }

  async delete(restaurantId: string): Promise<void> {
    await this.db.restaurant.delete({ where: { id: restaurantId } });
  }
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}
