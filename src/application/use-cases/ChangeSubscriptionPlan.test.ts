import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChangeSubscriptionPlan } from "./ChangeSubscriptionPlan";
import {
  createMockRestaurantRepo,
  restaurantFixtureForTier,
} from "./__fixtures__/restaurantRepoMock";
import { createMockBillingRepo } from "./__fixtures__/billingRepoMock";
import {
  createMockPaymentGateway,
  subscriptionDetailsFixture,
} from "./__fixtures__/paymentGatewayMock";
import { DomainError } from "@/domain/errors/DomainError";

const BILLING = {
  restaurantId: "resto-1",
  stripeCustomerId: "cus_abc123",
  stripeSubscriptionId: "sub_xyz789",
};

const billingRepoWithSub = () => createMockBillingRepo({ findByRestaurantId: async () => BILLING });

describe("ChangeSubscriptionPlan", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_PRICE_ID_STARTER", "price_starter");
    vi.stubEnv("STRIPE_PRICE_ID", "price_pro");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("upgrades STARTER → PRO immediately and mirrors the new tier in the DB", async () => {
    const gateway = createMockPaymentGateway({
      getSubscription: vi.fn(async () => subscriptionDetailsFixture()),
    });
    const billingRepo = billingRepoWithSub();
    const useCase = new ChangeSubscriptionPlan(
      createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixtureForTier("STARTER"),
      }),
      billingRepo,
      gateway,
    );

    const result = await useCase.execute({ restaurantId: "resto-1", targetTier: "PRO" });

    expect(result).toEqual({ kind: "upgrade", effectiveAtISO: null });
    expect(gateway.changeSubscriptionPlan).toHaveBeenCalledWith({
      subscriptionId: "sub_xyz789",
      targetTier: "PRO",
      timing: "immediate",
    });
    expect(billingRepo.updateRestaurantPlan).toHaveBeenCalledWith("resto-1", {
      tier: "PRO",
      status: "ACTIVE",
    });
    expect(gateway.releaseScheduledPlanChange).not.toHaveBeenCalled();
  });

  it("does NOT touch the DB when the immediate upgrade payment fails", async () => {
    const gateway = createMockPaymentGateway({
      getSubscription: vi.fn(async () => subscriptionDetailsFixture()),
      changeSubscriptionPlan: vi.fn(async () => {
        throw new DomainError("payment_failed");
      }),
    });
    const billingRepo = billingRepoWithSub();
    const useCase = new ChangeSubscriptionPlan(
      createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixtureForTier("STARTER"),
      }),
      billingRepo,
      gateway,
    );

    await expect(
      useCase.execute({ restaurantId: "resto-1", targetTier: "PRO" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "payment_failed" });
    expect(billingRepo.updateRestaurantPlan).not.toHaveBeenCalled();
  });

  it("schedules a PRO → STARTER downgrade at period end without touching the DB", async () => {
    const gateway = createMockPaymentGateway({
      getSubscription: vi.fn(async () => subscriptionDetailsFixture({ priceId: "price_pro" })),
    });
    const billingRepo = billingRepoWithSub();
    const useCase = new ChangeSubscriptionPlan(
      createMockRestaurantRepo({ getRestaurantById: async () => restaurantFixtureForTier("PRO") }),
      billingRepo,
      gateway,
    );

    const result = await useCase.execute({ restaurantId: "resto-1", targetTier: "STARTER" });

    expect(result).toEqual({ kind: "downgrade", effectiveAtISO: "2026-10-15T10:00:00.000Z" });
    expect(gateway.changeSubscriptionPlan).toHaveBeenCalledWith({
      subscriptionId: "sub_xyz789",
      targetTier: "STARTER",
      timing: "period_end",
    });
    expect(billingRepo.updateRestaurantPlan).not.toHaveBeenCalled();
  });

  it("releases the scheduled downgrade when PRO is chosen again", async () => {
    const gateway = createMockPaymentGateway({
      getSubscription: vi.fn(async () =>
        subscriptionDetailsFixture({ priceId: "price_pro", scheduledPriceId: "price_starter" }),
      ),
    });
    const useCase = new ChangeSubscriptionPlan(
      createMockRestaurantRepo({ getRestaurantById: async () => restaurantFixtureForTier("PRO") }),
      billingRepoWithSub(),
      gateway,
    );

    const result = await useCase.execute({ restaurantId: "resto-1", targetTier: "PRO" });

    expect(result).toEqual({ kind: "revert_downgrade", effectiveAtISO: null });
    expect(gateway.releaseScheduledPlanChange).toHaveBeenCalledWith("sub_xyz789");
    expect(gateway.changeSubscriptionPlan).not.toHaveBeenCalled();
  });

  it("rejects same_plan when PRO is chosen with nothing scheduled", async () => {
    const gateway = createMockPaymentGateway({
      getSubscription: vi.fn(async () => subscriptionDetailsFixture({ priceId: "price_pro" })),
    });
    const useCase = new ChangeSubscriptionPlan(
      createMockRestaurantRepo({ getRestaurantById: async () => restaurantFixtureForTier("PRO") }),
      billingRepoWithSub(),
      gateway,
    );

    await expect(
      useCase.execute({ restaurantId: "resto-1", targetTier: "PRO" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "same_plan", metadata: { tier: "PRO" } });
    expect(gateway.changeSubscriptionPlan).not.toHaveBeenCalled();
    expect(gateway.releaseScheduledPlanChange).not.toHaveBeenCalled();
  });

  it("rejects cancellation_pending while a cancellation is scheduled", async () => {
    const gateway = createMockPaymentGateway({
      getSubscription: vi.fn(async () => subscriptionDetailsFixture({ cancelAtPeriodEnd: true })),
    });
    const useCase = new ChangeSubscriptionPlan(
      createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixtureForTier("STARTER"),
      }),
      billingRepoWithSub(),
      gateway,
    );

    await expect(
      useCase.execute({ restaurantId: "resto-1", targetTier: "PRO" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "cancellation_pending" });
    expect(gateway.changeSubscriptionPlan).not.toHaveBeenCalled();
  });

  it("rejects subscription_not_active for a PAST_DUE restaurant", async () => {
    const gateway = createMockPaymentGateway({
      getSubscription: vi.fn(async () => subscriptionDetailsFixture({ status: "past_due" })),
    });
    const useCase = new ChangeSubscriptionPlan(
      createMockRestaurantRepo({
        getRestaurantById: async () =>
          restaurantFixtureForTier("STARTER", { planStatus: "PAST_DUE" }),
      }),
      billingRepoWithSub(),
      gateway,
    );

    await expect(
      useCase.execute({ restaurantId: "resto-1", targetTier: "PRO" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "subscription_not_active" });
  });

  it("throws subscription_missing without a billing row (FREE)", async () => {
    const gateway = createMockPaymentGateway();
    const useCase = new ChangeSubscriptionPlan(
      createMockRestaurantRepo({ getRestaurantById: async () => restaurantFixtureForTier("FREE") }),
      createMockBillingRepo(),
      gateway,
    );

    await expect(
      useCase.execute({ restaurantId: "resto-1", targetTier: "PRO" }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "subscription_missing",
      metadata: { entityId: "resto-1" },
    });
    expect(gateway.getSubscription).not.toHaveBeenCalled();
  });

  it("throws subscription_missing when Stripe no longer knows the subscription", async () => {
    const gateway = createMockPaymentGateway({ getSubscription: vi.fn(async () => null) });
    const useCase = new ChangeSubscriptionPlan(
      createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixtureForTier("STARTER"),
      }),
      billingRepoWithSub(),
      gateway,
    );

    await expect(
      useCase.execute({ restaurantId: "resto-1", targetTier: "PRO" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "subscription_missing" });
  });

  it("throws restaurant_not_found", async () => {
    const useCase = new ChangeSubscriptionPlan(
      createMockRestaurantRepo({ getRestaurantById: async () => null }),
      billingRepoWithSub(),
      createMockPaymentGateway(),
    );

    await expect(
      useCase.execute({ restaurantId: "resto-1", targetTier: "PRO" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "restaurant_not_found" });
  });
});
