import type { BillingRepository } from "@/application/ports/BillingRepository";
import type { PaymentGateway } from "@/application/ports/PaymentGateway";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import { SubscriptionChangePolicy, type PaidTier } from "@/domain/billing/SubscriptionChangePolicy";
import { DomainError } from "@/domain/errors/DomainError";
import { resolvePaidTier } from "./GetSubscriptionOverview";

export type ChangeSubscriptionPlanInput = {
  restaurantId: string;
  targetTier: PaidTier;
};

export type ChangeSubscriptionPlanOutput = {
  kind: "upgrade" | "downgrade" | "revert_downgrade";
  /** Date d'effet (ISO) pour une rétrogradation programmée ; `null` = effet immédiat. */
  effectiveAtISO: string | null;
};

/**
 * Changement de formule STARTER ↔ PRO depuis la page Abonnement (plus de passage par le
 * portail Stripe). La décision vient de `SubscriptionChangePolicy` ; l'exécution suit le
 * contrat des CGU :
 * - upgrade  → Stripe facture le prorata immédiatement, puis la DB passe au nouveau tier
 *   sans attendre le webhook (`customer.subscription.updated` le confirmera, idempotent) —
 *   sinon l'utilisateur reverrait STARTER pendant quelques secondes après avoir payé ;
 * - downgrade → programmé chez Stripe à la fin de période ; la DB ne bouge qu'au webhook
 *   émis à l'entrée de la nouvelle phase (l'accès PRO reste dû jusque-là) ;
 * - revert    → lève la rétrogradation programmée, rien d'autre ne change.
 * Un paiement de prorata refusé ⇒ `payment_failed` (Stripe n'a rien modifié).
 */
export class ChangeSubscriptionPlan {
  constructor(
    private readonly restaurantRepo: RestaurantRepository,
    private readonly billingRepo: BillingRepository,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async execute(input: ChangeSubscriptionPlanInput): Promise<ChangeSubscriptionPlanOutput> {
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

    const decision = SubscriptionChangePolicy.decidePlanChange({
      currentTier: restaurant.planTier,
      planStatus: restaurant.planStatus,
      targetTier: input.targetTier,
      cancelAtPeriodEnd: details.cancelAtPeriodEnd,
      scheduledTier: resolvePaidTier(details.scheduledPriceId),
    });
    if (!decision.allowed) {
      throw new DomainError(decision.reason, { tier: restaurant.planTier });
    }

    if (decision.kind === "revert_downgrade") {
      await this.paymentGateway.releaseScheduledPlanChange(details.subscriptionId);
      return { kind: "revert_downgrade", effectiveAtISO: null };
    }

    if (decision.kind === "downgrade") {
      await this.paymentGateway.changeSubscriptionPlan({
        subscriptionId: details.subscriptionId,
        targetTier: input.targetTier,
        timing: "period_end",
      });
      return { kind: "downgrade", effectiveAtISO: details.currentPeriodEndISO };
    }

    await this.paymentGateway.changeSubscriptionPlan({
      subscriptionId: details.subscriptionId,
      targetTier: input.targetTier,
      timing: "immediate",
    });
    // Stripe a accepté ET encaissé le prorata : la DB reflète le nouveau tier tout de suite.
    await this.billingRepo.updateRestaurantPlan(input.restaurantId, {
      tier: input.targetTier,
      status: "ACTIVE",
    });
    return { kind: "upgrade", effectiveAtISO: null };
  }
}
