import type { BillingRepository } from "@/application/ports/BillingRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import { BillingPolicy } from "@/domain/billing/BillingPolicy";

export type HandleStripeWebhookInput = {
  eventType: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  restaurantId: string;
};

export type HandleStripeWebhookOutput = {
  status: "processed" | "skipped";
  reason?: string;
};

export class HandleStripeWebhook {
  constructor(
    private readonly billingRepo: BillingRepository,
    private readonly restaurantRepo: RestaurantRepository,
  ) {}

  async execute(input: HandleStripeWebhookInput): Promise<HandleStripeWebhookOutput> {
    const resolved = BillingPolicy.resolveNewPlanStatus(input.eventType);
    if (resolved.status === null) {
      return { status: "skipped", reason: resolved.reason };
    }

    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant introuvable");
    }

    const transition = BillingPolicy.checkTransition(restaurant.planStatus, resolved.status);
    if (!transition.allowed) {
      return { status: "skipped", reason: transition.reason };
    }

    await this.billingRepo.upsertBilling({
      restaurantId: input.restaurantId,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
    });

    await this.billingRepo.updatePlanStatus(input.restaurantId, resolved.status);

    return { status: "processed" };
  }
}
