import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { PlanTier } from "@/domain/billing/PlanPolicy";

export interface BillingInfo {
  restaurantId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export interface BillingRepository {
  upsertBilling(params: {
    restaurantId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
  }): Promise<void>;
  findByRestaurantId(restaurantId: string): Promise<BillingInfo | null>;
  /**
   * Met à jour atomiquement le tier ET le status. Appelé par `HandleStripeWebhook`
   * quand on reçoit un event qui modifie l'un, l'autre, ou les deux. `tier`/`status`
   * peuvent être identiques aux valeurs courantes — le repo applique tel quel sans
   * vérifier (la transition est déjà validée par `BillingPolicy.checkTransition`).
   */
  updateRestaurantPlan(
    restaurantId: string,
    params: { tier: PlanTier; status: PlanStatus },
  ): Promise<void>;
}
