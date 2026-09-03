import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GetSubscriptionOverview, INVOICE_HISTORY_LIMIT } from "./GetSubscriptionOverview";
import {
  createMockRestaurantRepo,
  restaurantFixtureForTier,
} from "./__fixtures__/restaurantRepoMock";
import { createMockBillingRepo } from "./__fixtures__/billingRepoMock";
import {
  createMockPaymentGateway,
  invoiceFixture,
  subscriptionDetailsFixture,
} from "./__fixtures__/paymentGatewayMock";

const BILLING = {
  restaurantId: "resto-1",
  stripeCustomerId: "cus_abc123",
  stripeSubscriptionId: "sub_xyz789",
};

const INPUT = { restaurantId: "resto-1" };

describe("GetSubscriptionOverview", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_PRICE_ID_STARTER", "price_starter");
    vi.stubEnv("STRIPE_PRICE_ID", "price_pro");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the DB tier/status with no subscription nor invoices when billing is absent (FREE)", async () => {
    const gateway = createMockPaymentGateway();
    const useCase = new GetSubscriptionOverview(
      createMockRestaurantRepo({ getRestaurantById: async () => restaurantFixtureForTier("FREE") }),
      createMockBillingRepo(),
      gateway,
    );

    const result = await useCase.execute(INPUT);

    expect(result).toEqual({
      tier: "FREE",
      status: "FREE",
      subscription: null,
      invoices: [],
      upgradePreview: null,
    });
    expect(gateway.getSubscription).not.toHaveBeenCalled();
    expect(gateway.listInvoices).not.toHaveBeenCalled();
    expect(gateway.previewPlanChange).not.toHaveBeenCalled();
  });

  it("enriches an active STARTER with live details, invoices and the PRO upgrade preview", async () => {
    const invoice = invoiceFixture();
    const gateway = createMockPaymentGateway({
      getSubscription: vi.fn(async () => subscriptionDetailsFixture()),
      listInvoices: vi.fn(async () => [invoice]),
      previewPlanChange: vi.fn(async () => ({ amountDueCents: 1327, currency: "eur" })),
    });
    const useCase = new GetSubscriptionOverview(
      createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixtureForTier("STARTER"),
      }),
      createMockBillingRepo({ findByRestaurantId: async () => BILLING }),
      gateway,
    );

    const result = await useCase.execute(INPUT);

    expect(result).toEqual({
      tier: "STARTER",
      status: "ACTIVE",
      subscription: {
        currentPeriodEndISO: "2026-10-15T10:00:00.000Z",
        cancelAtPeriodEnd: false,
        scheduledTier: null,
        paymentMethod: { brand: "visa", last4: "4242", expMonth: 12, expYear: 2030 },
      },
      invoices: [invoice],
      upgradePreview: { targetTier: "PRO", amountDueCents: 1327, currency: "eur" },
    });
    expect(gateway.getSubscription).toHaveBeenCalledWith("sub_xyz789");
    expect(gateway.listInvoices).toHaveBeenCalledWith({
      stripeCustomerId: "cus_abc123",
      limit: INVOICE_HISTORY_LIMIT,
    });
    expect(gateway.previewPlanChange).toHaveBeenCalledWith({
      subscriptionId: "sub_xyz789",
      targetTier: "PRO",
    });
  });

  it("resolves a scheduled downgrade price to its tier and skips the upgrade preview", async () => {
    const gateway = createMockPaymentGateway({
      getSubscription: vi.fn(async () =>
        subscriptionDetailsFixture({ priceId: "price_pro", scheduledPriceId: "price_starter" }),
      ),
    });
    const useCase = new GetSubscriptionOverview(
      createMockRestaurantRepo({ getRestaurantById: async () => restaurantFixtureForTier("PRO") }),
      createMockBillingRepo({ findByRestaurantId: async () => BILLING }),
      gateway,
    );

    const result = await useCase.execute(INPUT);

    expect(result.subscription?.scheduledTier).toBe("STARTER");
    expect(result.upgradePreview).toBeNull();
    expect(gateway.previewPlanChange).not.toHaveBeenCalled();
  });

  it("treats an unknown scheduled price as no scheduled change", async () => {
    const gateway = createMockPaymentGateway({
      getSubscription: vi.fn(async () =>
        subscriptionDetailsFixture({ scheduledPriceId: "price_from_another_env" }),
      ),
    });
    const useCase = new GetSubscriptionOverview(
      createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixtureForTier("STARTER"),
      }),
      createMockBillingRepo({ findByRestaurantId: async () => BILLING }),
      gateway,
    );

    const result = await useCase.execute(INPUT);

    expect(result.subscription?.scheduledTier).toBeNull();
  });

  it.each([
    ["a pending cancellation", subscriptionDetailsFixture({ cancelAtPeriodEnd: true })],
    ["a PRO restaurant", subscriptionDetailsFixture()],
  ])("skips the upgrade preview with %s", async (label, details) => {
    const gateway = createMockPaymentGateway({ getSubscription: vi.fn(async () => details) });
    const tier = label === "a PRO restaurant" ? "PRO" : "STARTER";
    const useCase = new GetSubscriptionOverview(
      createMockRestaurantRepo({ getRestaurantById: async () => restaurantFixtureForTier(tier) }),
      createMockBillingRepo({ findByRestaurantId: async () => BILLING }),
      gateway,
    );

    const result = await useCase.execute(INPUT);

    expect(result.upgradePreview).toBeNull();
    expect(gateway.previewPlanChange).not.toHaveBeenCalled();
  });

  it("skips the upgrade preview for a STARTER in PAST_DUE", async () => {
    const gateway = createMockPaymentGateway({
      getSubscription: vi.fn(async () => subscriptionDetailsFixture({ status: "past_due" })),
    });
    const useCase = new GetSubscriptionOverview(
      createMockRestaurantRepo({
        getRestaurantById: async () =>
          restaurantFixtureForTier("STARTER", { planStatus: "PAST_DUE" }),
      }),
      createMockBillingRepo({ findByRestaurantId: async () => BILLING }),
      gateway,
    );

    const result = await useCase.execute(INPUT);

    expect(result.status).toBe("PAST_DUE");
    expect(result.subscription).not.toBeNull();
    expect(result.upgradePreview).toBeNull();
  });

  it.each(["canceled", "incomplete_expired"])(
    "falls back to the DB state when Stripe reports the subscription as %s",
    async (status) => {
      const gateway = createMockPaymentGateway({
        getSubscription: vi.fn(async () => subscriptionDetailsFixture({ status })),
        listInvoices: vi.fn(async () => [invoiceFixture()]),
      });
      const useCase = new GetSubscriptionOverview(
        createMockRestaurantRepo({
          getRestaurantById: async () => restaurantFixtureForTier("STARTER"),
        }),
        createMockBillingRepo({ findByRestaurantId: async () => BILLING }),
        gateway,
      );

      const result = await useCase.execute(INPUT);

      expect(result.subscription).toBeNull();
      expect(result.invoices).toHaveLength(1);
      expect(result.upgradePreview).toBeNull();
    },
  );

  it("falls back to the DB state when Stripe no longer knows the subscription (null)", async () => {
    const gateway = createMockPaymentGateway({ getSubscription: vi.fn(async () => null) });
    const useCase = new GetSubscriptionOverview(
      createMockRestaurantRepo({ getRestaurantById: async () => restaurantFixtureForTier("PRO") }),
      createMockBillingRepo({ findByRestaurantId: async () => BILLING }),
      gateway,
    );

    const result = await useCase.execute(INPUT);

    expect(result).toMatchObject({ tier: "PRO", status: "ACTIVE", subscription: null });
  });

  it("throws restaurant_not_found before touching Stripe", async () => {
    const gateway = createMockPaymentGateway();
    const useCase = new GetSubscriptionOverview(
      createMockRestaurantRepo({ getRestaurantById: async () => null }),
      createMockBillingRepo({ findByRestaurantId: async () => BILLING }),
      gateway,
    );

    await expect(useCase.execute(INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "restaurant_not_found",
      metadata: { entityId: "resto-1" },
    });
    expect(gateway.getSubscription).not.toHaveBeenCalled();
  });
});
