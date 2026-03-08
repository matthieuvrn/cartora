import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { InitialCategory } from "@/domain/restaurant/RestaurantInitPolicy";
import type { PrismaClient, CategoryType } from "@/generated/prisma/client";

export class PrismaRestaurantRepository implements RestaurantRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByOwnerUserId(
    ownerUserId: string
  ): Promise<{ id: string } | null> {
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
  }): Promise<{ id: string }> {
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const slug =
        attempt === 0
          ? params.slug
          : `${params.slug}-${randomSuffix()}`;

      try {
        return await this.db.$transaction(async (tx) => {
          const restaurant = await tx.restaurant.create({
            data: {
              ownerUserId: params.ownerUserId,
              displayName: params.displayName,
              slug,
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
              type: cat.type as CategoryType,
              order: cat.order,
            })),
          });

          return restaurant;
        });
      } catch (error: unknown) {
        const isUniqueViolation =
          error instanceof Error &&
          error.message.includes("Unique constraint");

        if (isUniqueViolation && attempt < maxRetries) {
          continue;
        }
        throw error;
      }
    }

    throw new Error("Failed to create restaurant after retries");
  }
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}
