import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import {
  DEFAULT_DISPLAY_NAME,
  generateSlug,
  type InitialCategory,
  type RestaurantType,
} from "@/domain/restaurant/RestaurantInitPolicy";

export type EnsureRestaurantInput = {
  userId: string;
  restaurantType?: RestaurantType | null;
  categories: InitialCategory[];
};

export type EnsureRestaurantOutput = {
  restaurantId: string;
  created: boolean;
};

export class EnsureRestaurantExists {
  constructor(private readonly repo: RestaurantRepository) {}

  async execute(input: EnsureRestaurantInput): Promise<EnsureRestaurantOutput> {
    const existing = await this.repo.findByOwnerUserId(input.userId);

    if (existing) {
      return { restaurantId: existing.id, created: false };
    }

    const slug = generateSlug(input.userId);

    const restaurant = await this.repo.createWithMenuAndCategories({
      ownerUserId: input.userId,
      displayName: DEFAULT_DISPLAY_NAME,
      slug,
      categories: input.categories,
      restaurantType: input.restaurantType ?? null,
    });

    return { restaurantId: restaurant.id, created: true };
  }
}
