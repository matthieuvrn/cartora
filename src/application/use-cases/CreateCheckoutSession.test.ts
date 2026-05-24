import { describe, it, expect, vi } from "vitest";
import { CreateCheckoutSession } from "./CreateCheckoutSession";
import { createMockRestaurantRepo, restaurantFixture } from "./__fixtures__/restaurantRepoMock";
import { createMockPaymentGateway } from "./__fixtures__/paymentGatewayMock";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";

const VALID_INPUT = {
  restaurantId: "resto-1",
  customerEmail: "owner@example.com",
  baseUrl: "https://cartora.app",
  targetTier: "PRO" as const,
};

/** Restaurants partant d'un état FREE (le cas standard pour démarrer un checkout). */
const freeRestaurantRepo = () =>
  createMockRestaurantRepo({
    getRestaurantById: async () => restaurantFixture({ planStatus: "FREE", planTier: "FREE" }),
  });

describe("CreateCheckoutSession", () => {
  it("creates checkout session for FREE plan, PRO tier", async () => {
    const gateway = createMockPaymentGateway({
      createCheckoutSession: vi.fn(async () => ({
        url: "https://checkout.stripe.com/session_123",
      })),
    });
    const useCase = new CreateCheckoutSession(freeRestaurantRepo(), gateway);

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
    const useCase = new CreateCheckoutSession(freeRestaurantRepo(), gateway);

    await useCase.execute({ ...VALID_INPUT, targetTier: "STARTER" });

    expect(gateway.createCheckoutSession).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      customerEmail: "owner@example.com",
      successUrl: "https://cartora.app/app?checkout=success",
      cancelUrl: "https://cartora.app/app?checkout=cancel",
      tier: "STARTER",
    });
  });

  it("allows checkout when planStatus is CANCELED (resub flow)", async () => {
    const gateway = createMockPaymentGateway();
    const useCase = new CreateCheckoutSession(
      createMockRestaurantRepo({
        getRestaurantById: async () =>
          restaurantFixture({ planStatus: "CANCELED", planTier: "FREE" }),
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
          getRestaurantById: async () => restaurantFixture({ planStatus, planTier: "STARTER" }),
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
