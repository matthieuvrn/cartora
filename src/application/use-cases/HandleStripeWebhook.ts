import type { BillingRepository } from "@/application/ports/BillingRepository";
import type { PaymentGateway } from "@/application/ports/PaymentGateway";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { WebhookEventRepository } from "@/application/ports/WebhookEventRepository";
import { BillingPolicy } from "@/domain/billing/BillingPolicy";
import { PlanPolicy, type PlanTier } from "@/domain/billing/PlanPolicy";

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
    private readonly paymentGateway: PaymentGateway,
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
      // Restaurant supprimé côté Cartora mais Stripe référence encore un abonnement/customer :
      // cas nominal après une suppression de compte (le customer.subscription.deleted arrive
      // après le DELETE), et cas orphelin (checkout complété après suppression, ou cleanup
      // Stripe partiel). COMPENSATION : on résilie l'abonnement et on supprime le customer —
      // les deux appels sont idempotents (contrat du port), donc sans effet sur un abonnement
      // déjà résilié, et personne ne peut être facturé pour un compte qui n'existe plus.
      // Un échec transitoire ici PROPAGE (⇒ 500, Stripe re-livre, la compensation est réessayée) ;
      // markProcessed n'est appelé qu'après compensation réussie pour la même raison.
      await this.paymentGateway.cancelSubscription(input.stripeSubscriptionId);
      await this.paymentGateway.deleteCustomer(input.stripeCustomerId);
      await this.webhookEventRepo.markProcessed(input.stripeEventId, input.eventType);
      return { status: "skipped", reason: "restaurant_not_found" };
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
