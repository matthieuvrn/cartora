import type { BillingRepository } from "@/application/ports/BillingRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { WebhookEventRepository } from "@/application/ports/WebhookEventRepository";
import { BillingPolicy } from "@/domain/billing/BillingPolicy";

export type HandleStripeWebhookInput = {
  stripeEventId: string;
  eventType: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  restaurantId: string;
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
      throw new Error("Restaurant introuvable");
    }

    const transition = BillingPolicy.checkTransition(restaurant.planStatus, resolved.status);
    if (!transition.allowed) {
      await this.webhookEventRepo.markProcessed(input.stripeEventId, input.eventType);
      return { status: "skipped", reason: transition.reason };
    }

    await this.billingRepo.upsertBilling({
      restaurantId: input.restaurantId,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
    });

    await this.billingRepo.updatePlanStatus(input.restaurantId, resolved.status);

    await this.webhookEventRepo.markProcessed(input.stripeEventId, input.eventType);

    return { status: "processed", slug: restaurant.slug };
  }
}
