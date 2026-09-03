import { describe, it, expect, vi } from "vitest";
import { UpdateSubscriptionCancellation } from "./UpdateSubscriptionCancellation";
import {
  createMockRestaurantRepo,
  restaurantFixtureForTier,
} from "./__fixtures__/restaurantRepoMock";
import { createMockBillingRepo } from "./__fixtures__/billingRepoMock";
import {
  createMockPaymentGateway,
  subscriptionDetailsFixture,
} from "./__fixtures__/paymentGatewayMock";

const BILLING = {
  restaurantId: "resto-1",
  stripeCustomerId: "cus_abc123",
  stripeSubscriptionId: "sub_xyz789",
};

const billingRepoWithSub = () => createMockBillingRepo({ findByRestaurantId: async () => BILLING });

describe("UpdateSubscriptionCancellation", () => {
  it("schedules the cancellation at period end and reports the access end date", async () => {
    const gateway = createMockPaymentGateway({
      getSubscription: vi.fn(async () => subscriptionDetailsFixture()),
    });
    const billingRepo = billingRepoWithSub();
    const useCase = new UpdateSubscriptionCancellation(
      createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixtureForTier("STARTER"),
      }),
      billingRepo,
      gateway,
    );

    const result = await useCase.execute({ restaurantId: "resto-1", cancel: true });

    expect(result).toEqual({
      cancelAtPeriodEnd: true,
      currentPeriodEndISO: "2026-10-15T10:00:00.000Z",
    });
    expect(gateway.setCancelAtPeriodEnd).toHaveBeenCalledWith({
      subscriptionId: "sub_xyz789",
      cancel: true,
    });
    // Le status DB ne bouge qu'au webhook `.deleted`, à l'échéance.
    expect(billingRepo.updateRestaurantPlan).not.toHaveBeenCalled();
  });

  it("resumes a pending cancellation", async () => {
    const gateway = createMockPaymentGateway({
      getSubscription: vi.fn(async () => subscriptionDetailsFixture({ cancelAtPeriodEnd: true })),
    });
    const useCase = new UpdateSubscriptionCancellation(
      createMockRestaurantRepo({ getRestaurantById: async () => restaurantFixtureForTier("PRO") }),
      billingRepoWithSub(),
      gateway,
    );

    const result = await useCase.execute({ restaurantId: "resto-1", cancel: false });

    expect(result).toEqual({
      cancelAtPeriodEnd: false,
      currentPeriodEndISO: "2026-10-15T10:00:00.000Z",
    });
    expect(gateway.setCancelAtPeriodEnd).toHaveBeenCalledWith({
      subscriptionId: "sub_xyz789",
      cancel: false,
    });
  });

  it("lets a PAST_DUE restaurant cancel", async () => {
    const gateway = createMockPaymentGateway({
      getSubscription: vi.fn(async () => subscriptionDetailsFixture({ status: "past_due" })),
    });
    const useCase = new UpdateSubscriptionCancellation(
      createMockRestaurantRepo({
        getRestaurantById: async () =>
          restaurantFixtureForTier("STARTER", { planStatus: "PAST_DUE" }),
      }),
      billingRepoWithSub(),
      gateway,
    );

    await useCase.execute({ restaurantId: "resto-1", cancel: true });

    expect(gateway.setCancelAtPeriodEnd).toHaveBeenCalledWith({
      subscriptionId: "sub_xyz789",
      cancel: true,
    });
  });

  it("rejects cancellation_pending when cancelling twice", async () => {
    const gateway = createMockPaymentGateway({
      getSubscription: vi.fn(async () => subscriptionDetailsFixture({ cancelAtPeriodEnd: true })),
    });
    const useCase = new UpdateSubscriptionCancellation(
      createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixtureForTier("STARTER"),
      }),
      billingRepoWithSub(),
      gateway,
    );

    await expect(useCase.execute({ restaurantId: "resto-1", cancel: true })).rejects.toMatchObject({
      name: "DomainError",
      code: "cancellation_pending",
      metadata: { tier: "STARTER" },
    });
    expect(gateway.setCancelAtPeriodEnd).not.toHaveBeenCalled();
  });

  it("rejects no_pending_cancellation when resuming with nothing pending", async () => {
    const gateway = createMockPaymentGateway({
      getSubscription: vi.fn(async () => subscriptionDetailsFixture()),
    });
    const useCase = new UpdateSubscriptionCancellation(
      createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixtureForTier("STARTER"),
      }),
      billingRepoWithSub(),
      gateway,
    );

    await expect(useCase.execute({ restaurantId: "resto-1", cancel: false })).rejects.toMatchObject(
      { name: "DomainError", code: "no_pending_cancellation" },
    );
    expect(gateway.setCancelAtPeriodEnd).not.toHaveBeenCalled();
  });

  it("throws subscription_missing without a subscription id", async () => {
    const gateway = createMockPaymentGateway();
    const useCase = new UpdateSubscriptionCancellation(
      createMockRestaurantRepo({ getRestaurantById: async () => restaurantFixtureForTier("FREE") }),
      createMockBillingRepo({
        findByRestaurantId: async () => ({ ...BILLING, stripeSubscriptionId: null }),
      }),
      gateway,
    );

    await expect(useCase.execute({ restaurantId: "resto-1", cancel: true })).rejects.toMatchObject({
      name: "DomainError",
      code: "subscription_missing",
    });
    expect(gateway.getSubscription).not.toHaveBeenCalled();
  });

  it("throws subscription_missing when Stripe no longer knows the subscription", async () => {
    const gateway = createMockPaymentGateway({ getSubscription: vi.fn(async () => null) });
    const useCase = new UpdateSubscriptionCancellation(
      createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixtureForTier("STARTER"),
      }),
      billingRepoWithSub(),
      gateway,
    );

    await expect(useCase.execute({ restaurantId: "resto-1", cancel: true })).rejects.toMatchObject({
      name: "DomainError",
      code: "subscription_missing",
    });
  });

  it("throws restaurant_not_found", async () => {
    const useCase = new UpdateSubscriptionCancellation(
      createMockRestaurantRepo({ getRestaurantById: async () => null }),
      billingRepoWithSub(),
      createMockPaymentGateway(),
    );

    await expect(useCase.execute({ restaurantId: "resto-1", cancel: true })).rejects.toMatchObject({
      name: "DomainError",
      code: "restaurant_not_found",
    });
  });
});
