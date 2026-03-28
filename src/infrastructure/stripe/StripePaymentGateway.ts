import Stripe from "stripe";
import type { PaymentGateway, StripeWebhookEvent } from "@/application/ports/PaymentGateway";

export class StripePaymentGateway implements PaymentGateway {
  private readonly stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  private readonly priceId = process.env.STRIPE_PRICE_ID!;
  private readonly webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  async createCheckoutSession(params: {
    restaurantId: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: this.priceId, quantity: 1 }],
      customer_email: params.customerEmail,
      metadata: { restaurantId: params.restaurantId },
      allow_promotion_codes: true,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    if (!session.url) {
      throw new Error("Stripe returned no checkout URL");
    }

    return { url: session.url };
  }

  async createPortalSession(params: {
    stripeCustomerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: params.stripeCustomerId,
      return_url: params.returnUrl,
    });

    return { url: session.url };
  }

  verifyWebhookSignature(payload: string, signature: string): StripeWebhookEvent {
    const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);

    return {
      id: event.id,
      type: event.type,
      created: event.created,
      data: event.data.object as unknown as Record<string, unknown>,
    };
  }
}
