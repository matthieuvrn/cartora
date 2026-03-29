import type { InitialCategory } from "@/domain/restaurant/RestaurantInitPolicy";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";

export interface RestaurantRepository {
  findByOwnerUserId(ownerUserId: string): Promise<{ id: string } | null>;

  createWithMenuAndCategories(params: {
    ownerUserId: string;
    displayName: string;
    slug: string;
    categories: InitialCategory[];
  }): Promise<{ id: string }>;

  getRestaurantById(id: string): Promise<{
    id: string;
    slug: string;
    displayName: string;
    planStatus: PlanStatus;
  } | null>;

  updateDisplayName(params: { restaurantId: string; displayName: string }): Promise<void>;
}
