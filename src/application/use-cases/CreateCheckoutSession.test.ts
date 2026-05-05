import { describe, it, expect, vi } from "vitest";
import { CreateCheckoutSession } from "./CreateCheckoutSession";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { PaymentGateway } from "@/application/ports/PaymentGateway";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";

const RESTAURANT_FIXTURE = {
  id: "resto-1",
  slug: "resto-abcd1234",
  displayName: "Mon Restaurant",
  planStatus: "FREE" as PlanStatus,
  activationDismissedAt: null,
};

const VALID_INPUT = {
  restaurantId: "resto-1",
  customerEmail: "owner@example.com",
  baseUrl: "https://cartora.app",
};

function createMockRestaurantRepo(
  overrides: Partial<RestaurantRepository> = {},
): RestaurantRepository {
  return {
    findByOwnerUserId: async () => null,
    createWithMenuAndCategories: async () => ({ id: "id" }),
    getRestaurantById: async () => RESTAURANT_FIXTURE,
    updateDisplayName: async () => {},
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
    verifyWebhookSignature: () => ({ id: "", type: "", created: 0, data: {} }),
    cancelSubscription: async () => {},
    deleteCustomer: async () => {},
    ...overrides,
  };
}

describe("CreateCheckoutSession", () => {
  it("creates checkout session for FREE plan", async () => {
    const gateway = createMockPaymentGateway();
    const useCase = new CreateCheckoutSession(createMockRestaurantRepo(), gateway);

    const result = await useCase.execute(VALID_INPUT);

    expect(result).toEqual({ checkoutUrl: "https://checkout.stripe.com/session_123" });
    expect(gateway.createCheckoutSession).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      customerEmail: "owner@example.com",
      successUrl: "https://cartora.app/app?checkout=success",
      cancelUrl: "https://cartora.app/app?checkout=cancel",
    });
  });

  it("throws when restaurant not found", async () => {
    const gateway = createMockPaymentGateway();
    const useCase = new CreateCheckoutSession(
      createMockRestaurantRepo({ getRestaurantById: async () => null }),
      gateway,
    );

    await expect(useCase.execute(VALID_INPUT)).rejects.toThrow("Restaurant introuvable");
    expect(gateway.createCheckoutSession).not.toHaveBeenCalled();
  });

  it.each(["ACTIVE", "PAST_DUE", "CANCELED"] as PlanStatus[])(
    "throws when planStatus is %s",
    async (planStatus) => {
      const gateway = createMockPaymentGateway();
      const useCase = new CreateCheckoutSession(
        createMockRestaurantRepo({
          getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, planStatus }),
        }),
        gateway,
      );

      await expect(useCase.execute(VALID_INPUT)).rejects.toThrow(
        "Le restaurant possède déjà un abonnement",
      );
      expect(gateway.createCheckoutSession).not.toHaveBeenCalled();
    },
  );
});
