import { vi } from "vitest";
import type { PaymentGateway } from "@/application/ports/PaymentGateway";

/**
 * Mock par défaut implémentant toute méthode de `PaymentGateway` comme `vi.fn()`.
 * `createCheckoutSession` retourne un URL stub. `verifyWebhookSignature` est un
 * sync `vi.fn()` (pas async) qui retourne un event vide — override pour les
 * tests de webhook qui veulent un event spécifique.
 */
export function createMockPaymentGateway(overrides: Partial<PaymentGateway> = {}): PaymentGateway {
  return {
    createCheckoutSession: vi.fn(async () => ({ url: "https://checkout.stripe.com/session_test" })),
    createPortalSession: vi.fn(async () => ({ url: "https://billing.stripe.com/portal_test" })),
    verifyWebhookSignature: vi.fn(() => ({
      id: "",
      type: "",
      created: 0,
      data: {},
      priceId: null,
      customerId: null,
      subscriptionId: null,
      restaurantIdMetadata: null,
    })),
    fetchSubscriptionPriceId: vi.fn(async () => null),
    cancelSubscription: vi.fn(async () => {}),
    deleteCustomer: vi.fn(async () => {}),
    ...overrides,
  };
}
