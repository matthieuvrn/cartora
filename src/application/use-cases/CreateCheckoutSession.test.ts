import { describe, it, expect, vi } from "vitest";
import { CreateCheckoutSession } from "./CreateCheckoutSession";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { PaymentGateway } from "@/application/ports/PaymentGateway";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { PlanTier } from "@/domain/billing/PlanPolicy";

const RESTAURANT_FIXTURE = {
  id: "resto-1",
  slug: "resto-abcd1234",
  displayName: "Mon Restaurant",
  planStatus: "FREE" as PlanStatus,
  planTier: "FREE" as PlanTier,
  activationDismissedAt: null,
  logoPath: null,
};

const VALID_INPUT = {
  restaurantId: "resto-1",
  customerEmail: "owner@example.com",
  baseUrl: "https://cartora.app",
  targetTier: "PRO" as const,
};

function createMockRestaurantRepo(
  overrides: Partial<RestaurantRepository> = {},
): RestaurantRepository {
  return {
    findByOwnerUserId: async () => null,
    createWithMenuAndCategories: async () => ({ id: "id" }),
    getRestaurantById: async () => RESTAURANT_FIXTURE,
    updateDisplayName: async () => {},
    updateLogoPath: async () => {},
    markActivationDismissed: async () => {},
    delete: async () => {},
    ...overrides,
  };
}

function createMockPaymentGateway(overrides: Partial<PaymentGateway> = {}): PaymentGateway {
  return {
    createCheckoutSession: vi.fn(async () => ({
      url: "https://checkout.stripe.com/session_123",
    })),
    createPortalSession: async () => ({ url: "" }),
    verifyWebhookSignature: () => ({
      id: "",
      type: "",
      created: 0,
      data: {},
      priceId: null,
      customerId: null,
      subscriptionId: null,
      restaurantIdMetadata: null,
    }),
    fetchSubscriptionPriceId: async () => null,
    cancelSubscription: async () => {},
    deleteCustomer: async () => {},
    ...overrides,
  };
}

describe("CreateCheckoutSession", () => {
  it("creates checkout session for FREE plan, PRO tier", async () => {
    const gateway = createMockPaymentGateway();
    const useCase = new CreateCheckoutSession(createMockRestaurantRepo(), gateway);

    const result = await useCase.execute(VALID_INPUT);

    expect(result).toEqual({ checkoutUrl: "https://checkout.stripe.com/session_123" });
    expect(gateway.createCheckoutSession).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      customerEmail: "owner@example.com",
      successUrl: "https://cartora.app/app?checkout=success",
      cancelUrl: "https://cartora.app/app?checkout=cancel",
      tier: "PRO",
    });
  });

  it("creates checkout session for FREE plan, STARTER tier", async () => {
    const gateway = createMockPaymentGateway();
    const useCase = new CreateCheckoutSession(createMockRestaurantRepo(), gateway);

    await useCase.execute({ ...VALID_INPUT, targetTier: "STARTER" });

    expect(gateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ tier: "STARTER" }),
    );
  });

  it("allows checkout when planStatus is CANCELED (resub flow)", async () => {
    const gateway = createMockPaymentGateway();
    const useCase = new CreateCheckoutSession(
      createMockRestaurantRepo({
        getRestaurantById: async () => ({
          ...RESTAURANT_FIXTURE,
          planStatus: "CANCELED",
          planTier: "FREE",
        }),
      }),
      gateway,
    );

    await useCase.execute(VALID_INPUT);

    expect(gateway.createCheckoutSession).toHaveBeenCalled();
  });

  it("throws when restaurant not found", async () => {
    const gateway = createMockPaymentGateway();
    const useCase = new CreateCheckoutSession(
      createMockRestaurantRepo({ getRestaurantById: async () => null }),
      gateway,
    );

    await expect(useCase.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "restaurant_not_found",
    });
    expect(gateway.createCheckoutSession).not.toHaveBeenCalled();
  });

  it.each(["ACTIVE", "PAST_DUE"] as PlanStatus[])(
    "rejects checkout when planStatus is %s (must use Customer Portal)",
    async (planStatus) => {
      const gateway = createMockPaymentGateway();
      const useCase = new CreateCheckoutSession(
        createMockRestaurantRepo({
          getRestaurantById: async () => ({
            ...RESTAURANT_FIXTURE,
            planStatus,
            planTier: "STARTER",
          }),
        }),
        gateway,
      );

      await expect(useCase.execute(VALID_INPUT)).rejects.toMatchObject({
        name: "DomainError",
        code: "use_portal_to_change_plan",
      });
      expect(gateway.createCheckoutSession).not.toHaveBeenCalled();
    },
  );
});
