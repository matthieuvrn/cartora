import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { PaymentGateway } from "@/application/ports/PaymentGateway";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { DomainError } from "@/domain/errors/DomainError";

export type CreateCheckoutSessionInput = {
  restaurantId: string;
  customerEmail: string;
  baseUrl: string;
  /** Tier ciblé : sélectionne le bon STRIPE_PRICE_ID côté gateway. */
  targetTier: Extract<PlanTier, "STARTER" | "PRO">;
};

export type CreateCheckoutSessionOutput = {
  checkoutUrl: string;
};

export class CreateCheckoutSession {
  constructor(
    private readonly restaurantRepo: RestaurantRepository,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async execute(input: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionOutput> {
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    // Le checkout n'est utilisé QUE pour la première souscription ou la resub après
    // annulation. Les changements de tier (Starter ↔ Pro) doivent passer par le
    // Customer Portal qui appelle Stripe Subscriptions API et préserve la sub existante
    // (proration auto, idempotence). Voir étape 0.2 du plan d'exécution.
    if (restaurant.planStatus !== "FREE" && restaurant.planStatus !== "CANCELED") {
      throw new DomainError("use_portal_to_change_plan");
    }

    const { url } = await this.paymentGateway.createCheckoutSession({
      restaurantId: input.restaurantId,
      customerEmail: input.customerEmail,
      successUrl: input.baseUrl + "/app?checkout=success",
      cancelUrl: input.baseUrl + "/app?checkout=cancel",
      tier: input.targetTier,
    });

    return { checkoutUrl: url };
  }
}
