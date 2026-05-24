import { describe, it, expect, vi } from "vitest";
import { CreatePortalSession } from "./CreatePortalSession";
import { createMockBillingRepo } from "./__fixtures__/billingRepoMock";
import { createMockPaymentGateway } from "./__fixtures__/paymentGatewayMock";

const BILLING_FIXTURE = {
  restaurantId: "resto-1",
  stripeCustomerId: "cus_abc123",
  stripeSubscriptionId: "sub_xyz789",
};

const VALID_INPUT = {
  restaurantId: "resto-1",
  baseUrl: "https://cartora.app",
};

const billingRepoWithFixture = () =>
  createMockBillingRepo({ findByRestaurantId: async () => BILLING_FIXTURE });

describe("CreatePortalSession", () => {
  it("creates portal session when billing exists", async () => {
    const gateway = createMockPaymentGateway({
      createPortalSession: vi.fn(async () => ({
        url: "https://billing.stripe.com/portal_123",
      })),
    });
    const useCase = new CreatePortalSession(billingRepoWithFixture(), gateway);

    const result = await useCase.execute(VALID_INPUT);

    expect(result).toEqual({ portalUrl: "https://billing.stripe.com/portal_123" });
    expect(gateway.createPortalSession).toHaveBeenCalledWith({
      stripeCustomerId: "cus_abc123",
      returnUrl: "https://cartora.app/app",
    });
  });

  it("throws when billing info not found", async () => {
    const gateway = createMockPaymentGateway();
    const useCase = new CreatePortalSession(createMockBillingRepo(), gateway);

    await expect(useCase.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "billing_missing",
    });
    expect(gateway.createPortalSession).not.toHaveBeenCalled();
  });
});
