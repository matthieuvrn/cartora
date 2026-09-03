import { vi } from "vitest";
import type {
  InvoiceSummary,
  PaymentGateway,
  SubscriptionDetails,
} from "@/application/ports/PaymentGateway";

/**
 * Mock par défaut implémentant toute méthode de `PaymentGateway` comme `vi.fn()`.
 * `createCheckoutSession` retourne un URL stub. `verifyWebhookSignature` est un
 * sync `vi.fn()` (pas async) qui retourne un event vide — override pour les
 * tests de webhook qui veulent un event spécifique. `getSubscription` renvoie `null`
 * (abonnement inconnu de Stripe) et `listInvoices` une liste vide — override avec
 * `subscriptionDetailsFixture` / `invoiceFixture` pour les tests de la page Abonnement.
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
    getSubscription: vi.fn(async () => null),
    listInvoices: vi.fn(async () => []),
    previewPlanChange: vi.fn(async () => ({ amountDueCents: 0, currency: "eur" })),
    changeSubscriptionPlan: vi.fn(async () => {}),
    releaseScheduledPlanChange: vi.fn(async () => {}),
    setCancelAtPeriodEnd: vi.fn(async () => {}),
    cancelSubscription: vi.fn(async () => {}),
    deleteCustomer: vi.fn(async () => {}),
    ...overrides,
  };
}

/** Abonnement Stripe actif « nominal » : STARTER, renouvellement dans le futur, carte Visa. */
export function subscriptionDetailsFixture(
  overrides: Partial<SubscriptionDetails> = {},
): SubscriptionDetails {
  return {
    subscriptionId: "sub_xyz789",
    status: "active",
    priceId: "price_starter",
    currentPeriodEndISO: "2026-10-15T10:00:00.000Z",
    cancelAtPeriodEnd: false,
    scheduledPriceId: null,
    paymentMethod: { brand: "visa", last4: "4242", expMonth: 12, expYear: 2030 },
    ...overrides,
  };
}

export function invoiceFixture(overrides: Partial<InvoiceSummary> = {}): InvoiceSummary {
  return {
    id: "in_001",
    number: "CART-0001",
    createdAtISO: "2026-09-15T10:00:00.000Z",
    totalCents: 990,
    currency: "eur",
    status: "paid",
    hostedInvoiceUrl: "https://invoice.stripe.com/i/in_001",
    pdfUrl: "https://pay.stripe.com/invoice/in_001/pdf",
    ...overrides,
  };
}
