import type { InitialCategory, RestaurantType } from "@/domain/restaurant/RestaurantInitPolicy";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { PlanTier } from "@/domain/billing/PlanPolicy";

export interface RestaurantRepository {
  findByOwnerUserId(ownerUserId: string): Promise<{ id: string } | null>;

  createWithMenuAndCategories(params: {
    ownerUserId: string;
    displayName: string;
    slug: string;
    categories: InitialCategory[];
    restaurantType?: RestaurantType | null;
  }): Promise<{ id: string }>;

  getRestaurantById(id: string): Promise<{
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
  } | null>;

  updateDisplayName(params: { restaurantId: string; displayName: string }): Promise<void>;

  updateLogoPath(params: { restaurantId: string; logoPath: string | null }): Promise<void>;

  updateBrandColors(params: {
    restaurantId: string;
    primary: string | null;
    accent: string | null;
    background: string | null;
  }): Promise<void>;

  markActivationDismissed(restaurantId: string): Promise<void>;

  delete(restaurantId: string): Promise<void>;
}
