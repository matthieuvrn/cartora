import type { BillingRepository } from "@/application/ports/BillingRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { WebhookEventRepository } from "@/application/ports/WebhookEventRepository";
import { BillingPolicy } from "@/domain/billing/BillingPolicy";
import { PlanPolicy, type PlanTier } from "@/domain/billing/PlanPolicy";
import { DomainError } from "@/domain/errors/DomainError";

export type HandleStripeWebhookInput = {
  stripeEventId: string;
  eventType: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  restaurantId: string;
  /** Stripe price.id, ou null si l'event n'en porte pas (ex: invoice ambigu). */
  priceId: string | null;
};

export type HandleStripeWebhookOutput =
  | { status: "processed"; slug: string }
  | { status: "skipped"; reason?: string }
  | { status: "duplicate" };

export class HandleStripeWebhook {
  constructor(
    private readonly billingRepo: BillingRepository,
    private readonly restaurantRepo: RestaurantRepository,
    private readonly webhookEventRepo: WebhookEventRepository,
  ) {}

  async execute(input: HandleStripeWebhookInput): Promise<HandleStripeWebhookOutput> {
    const alreadyProcessed = await this.webhookEventRepo.isAlreadyProcessed(input.stripeEventId);
    if (alreadyProcessed) {
      return { status: "duplicate" };
    }

    const resolved = BillingPolicy.resolveNewPlanStatus(input.eventType);
    if (resolved.status === null) {
      await this.webhookEventRepo.markProcessed(input.stripeEventId, input.eventType);
      return { status: "skipped", reason: resolved.reason };
    }

    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      // Throw une DomainError ⇒ le route handler la mappe à un 400 (non-retriable),
      // Stripe arrête de retry sur un restaurant qui n'existe plus côté Cartora.
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    const transition = BillingPolicy.checkTransition(restaurant.planStatus, resolved.status);
    if (!transition.allowed) {
      await this.webhookEventRepo.markProcessed(input.stripeEventId, input.eventType);
      return { status: "skipped", reason: transition.reason };
    }

    // Détermination du nouveau tier :
    // - .deleted → on retombe systématiquement en FREE (subscription terminée).
    // - autres events avec priceId → mapping price → tier via PlanPolicy.
    // - autres events sans priceId (typiquement invoice.paid sans line.price exploitable)
    //   → on conserve le tier actuel pour ne pas écraser à FREE par erreur.
    let nextTier: PlanTier;
    if (input.eventType === "customer.subscription.deleted") {
      nextTier = "FREE";
    } else if (input.priceId) {
      const resolvedTier = PlanPolicy.resolveTierFromPriceId(input.priceId);
      if (!resolvedTier) {
        // Price inconnu → configuration cassée. On marque traité pour ne pas boucler
        // mais on n'écrit rien.
        await this.webhookEventRepo.markProcessed(input.stripeEventId, input.eventType);
        return { status: "skipped", reason: "unknown_price_id" };
      }
      nextTier = resolvedTier;
    } else {
      nextTier = restaurant.planTier;
    }

    await this.billingRepo.upsertBilling({
      restaurantId: input.restaurantId,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
    });

    await this.billingRepo.updateRestaurantPlan(input.restaurantId, {
      tier: nextTier,
      status: resolved.status,
    });

    await this.webhookEventRepo.markProcessed(input.stripeEventId, input.eventType);

    return { status: "processed", slug: restaurant.slug };
  }
}
