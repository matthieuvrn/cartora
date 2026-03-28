import type { PlanStatus } from "@/domain/menu/PublicationPolicy";

export interface BillingInfo {
  restaurantId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}

export interface BillingRepository {
  upsertBilling(params: {
    restaurantId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
  }): Promise<void>;
  findByRestaurantId(restaurantId: string): Promise<BillingInfo | null>;
  updatePlanStatus(restaurantId: string, planStatus: PlanStatus): Promise<void>;
}
