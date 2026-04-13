export interface StripeWebhookEvent {
  id: string;
  type: string;
  created: number;
  data: Record<string, unknown>;
}

export interface PaymentGateway {
  createCheckoutSession(params: {
    restaurantId: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;
  createPortalSession(params: {
    stripeCustomerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
  verifyWebhookSignature(payload: string, signature: string): StripeWebhookEvent;
  cancelSubscription(subscriptionId: string): Promise<void>;
  deleteCustomer(customerId: string): Promise<void>;
}
