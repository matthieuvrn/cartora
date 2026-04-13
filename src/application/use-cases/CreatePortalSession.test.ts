import { describe, it, expect, vi } from "vitest";
import { CreatePortalSession } from "./CreatePortalSession";
import type { BillingRepository } from "@/application/ports/BillingRepository";
import type { PaymentGateway } from "@/application/ports/PaymentGateway";

const BILLING_FIXTURE = {
  restaurantId: "resto-1",
  stripeCustomerId: "cus_abc123",
  stripeSubscriptionId: "sub_xyz789",
};

const VALID_INPUT = {
  restaurantId: "resto-1",
  baseUrl: "https://cartora.app",
};

function createMockBillingRepo(overrides: Partial<BillingRepository> = {}): BillingRepository {
  return {
    upsertBilling: async () => {},
    findByRestaurantId: async () => BILLING_FIXTURE,
    updatePlanStatus: async () => {},
    ...overrides,
  };
}

function createMockPaymentGateway(overrides: Partial<PaymentGateway> = {}): PaymentGateway {
  return {
    createCheckoutSession: async () => ({ url: "" }),
    createPortalSession: vi.fn(async () => ({
      url: "https://billing.stripe.com/portal_123",
    })),
    verifyWebhookSignature: () => ({ id: "", type: "", created: 0, data: {} }),
    cancelSubscription: async () => {},
    deleteCustomer: async () => {},
    ...overrides,
  };
}

describe("CreatePortalSession", () => {
  it("creates portal session when billing exists", async () => {
    const gateway = createMockPaymentGateway();
    const useCase = new CreatePortalSession(createMockBillingRepo(), gateway);

    const result = await useCase.execute(VALID_INPUT);

    expect(result).toEqual({ portalUrl: "https://billing.stripe.com/portal_123" });
    expect(gateway.createPortalSession).toHaveBeenCalledWith({
      stripeCustomerId: "cus_abc123",
      returnUrl: "https://cartora.app/app",
    });
  });

  it("throws when billing info not found", async () => {
    const gateway = createMockPaymentGateway();
    const useCase = new CreatePortalSession(
      createMockBillingRepo({ findByRestaurantId: async () => null }),
      gateway,
    );

    await expect(useCase.execute(VALID_INPUT)).rejects.toThrow(
      "Aucune information de facturation trouvée",
    );
    expect(gateway.createPortalSession).not.toHaveBeenCalled();
  });
});
