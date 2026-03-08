import type { InitialCategory } from "@/domain/restaurant/RestaurantInitPolicy";

export interface RestaurantRepository {
  findByOwnerUserId(
    ownerUserId: string
  ): Promise<{ id: string } | null>;

  createWithMenuAndCategories(params: {
    ownerUserId: string;
    displayName: string;
    slug: string;
    categories: InitialCategory[];
  }): Promise<{ id: string }>;
}
