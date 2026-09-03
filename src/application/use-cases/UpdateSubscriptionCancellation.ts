import type { BillingRepository } from "@/application/ports/BillingRepository";
import type { PaymentGateway } from "@/application/ports/PaymentGateway";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import { SubscriptionChangePolicy } from "@/domain/billing/SubscriptionChangePolicy";
import { DomainError } from "@/domain/errors/DomainError";

export type UpdateSubscriptionCancellationInput = {
  restaurantId: string;
  /** `true` = programmer la résiliation à la fin de période ; `false` = la reprendre. */
  cancel: boolean;
};

export type UpdateSubscriptionCancellationOutput = {
  cancelAtPeriodEnd: boolean;
  /** Fin de la période en cours : date de fin d'accès si résilié, sinon prochain renouvellement. */
  currentPeriodEndISO: string;
};

/**
 * Résiliation / reprise depuis la page Abonnement. Toujours « à la fin de la période »
 * (promesse CGU + FAQ landing) : le status DB ne bouge pas ici — `customer.subscription.deleted`
 * le passera en CANCELED/FREE à l'échéance. La reprise reste possible tant que la période court.
 */
export class UpdateSubscriptionCancellation {
  constructor(
    private readonly restaurantRepo: RestaurantRepository,
    private readonly billingRepo: BillingRepository,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async execute(
    input: UpdateSubscriptionCancellationInput,
  ): Promise<UpdateSubscriptionCancellationOutput> {
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    const billing = await this.billingRepo.findByRestaurantId(input.restaurantId);
    if (!billing?.stripeSubscriptionId) {
      throw new DomainError("subscription_missing", { entityId: input.restaurantId });
    }

    const details = await this.paymentGateway.getSubscription(billing.stripeSubscriptionId);
    if (!details) {
      throw new DomainError("subscription_missing", { entityId: input.restaurantId });
    }

    const decision = SubscriptionChangePolicy.decideCancellation({
      planStatus: restaurant.planStatus,
      cancelAtPeriodEnd: details.cancelAtPeriodEnd,
      request: input.cancel ? "cancel" : "resume",
    });
    if (!decision.allowed) {
      throw new DomainError(decision.reason, { tier: restaurant.planTier });
    }

    await this.paymentGateway.setCancelAtPeriodEnd({
      subscriptionId: details.subscriptionId,
      cancel: input.cancel,
    });

    return { cancelAtPeriodEnd: input.cancel, currentPeriodEndISO: details.currentPeriodEndISO };
  }
}
