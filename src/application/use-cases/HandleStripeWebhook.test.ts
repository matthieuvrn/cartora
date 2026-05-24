import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HandleStripeWebhook } from "./HandleStripeWebhook";
import { createMockRestaurantRepo, restaurantFixture } from "./__fixtures__/restaurantRepoMock";
import { createMockBillingRepo } from "./__fixtures__/billingRepoMock";
import { createMockWebhookEventRepo } from "./__fixtures__/webhookEventRepoMock";

const STARTER_PRICE_ID = "price_starter_test_123";
const PRO_PRICE_ID = "price_pro_test_456";

const VALID_INPUT = {
  stripeEventId: "evt_test_123",
  eventType: "checkout.session.completed",
  stripeCustomerId: "cus_abc123",
  stripeSubscriptionId: "sub_xyz789",
  restaurantId: "resto-1",
  priceId: PRO_PRICE_ID,
};

/** Helper local : par défaut, les tests Stripe partent d'un restaurant FREE/FREE. */
const freeRestaurantRepo = (overrides = {}) =>
  createMockRestaurantRepo({
    getRestaurantById: async () => restaurantFixture({ planStatus: "FREE", planTier: "FREE" }),
    ...overrides,
  });

describe("HandleStripeWebhook", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_PRICE_ID", PRO_PRICE_ID);
    vi.stubEnv("STRIPE_PRICE_ID_STARTER", STARTER_PRICE_ID);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("processes checkout.session.completed for FREE restaurant (PRO priceId)", async () => {
    const billingRepo = createMockBillingRepo();
    const webhookEventRepo = createMockWebhookEventRepo();
    const useCase = new HandleStripeWebhook(billingRepo, freeRestaurantRepo(), webhookEventRepo);

    const result = await useCase.execute(VALID_INPUT);

    expect(result).toEqual({ status: "processed", slug: "resto-abcd1234" });
    expect(billingRepo.upsertBilling).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      stripeCustomerId: "cus_abc123",
      stripeSubscriptionId: "sub_xyz789",
    });
    expect(billingRepo.updateRestaurantPlan).toHaveBeenCalledWith("resto-1", {
      tier: "PRO",
      status: "ACTIVE",
    });
    expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
      "evt_test_123",
      "checkout.session.completed",
    );
  });

  it("processes checkout.session.completed with STARTER priceId → tier STARTER", async () => {
    const billingRepo = createMockBillingRepo();
    const useCase = new HandleStripeWebhook(
      billingRepo,
      freeRestaurantRepo(),
      createMockWebhookEventRepo(),
    );

    await useCase.execute({ ...VALID_INPUT, priceId: STARTER_PRICE_ID });

    expect(billingRepo.updateRestaurantPlan).toHaveBeenCalledWith("resto-1", {
      tier: "STARTER",
      status: "ACTIVE",
    });
  });

  it("processes customer.subscription.updated (Starter → Pro upgrade via Portal)", async () => {
    const billingRepo = createMockBillingRepo();
    const useCase = new HandleStripeWebhook(
      billingRepo,
      createMockRestaurantRepo({
        getRestaurantById: async () =>
          restaurantFixture({ planStatus: "ACTIVE", planTier: "STARTER" }),
      }),
      createMockWebhookEventRepo(),
    );

    const result = await useCase.execute({
      ...VALID_INPUT,
      eventType: "customer.subscription.updated",
      priceId: PRO_PRICE_ID,
    });

    expect(result).toEqual({ status: "processed", slug: "resto-abcd1234" });
    expect(billingRepo.updateRestaurantPlan).toHaveBeenCalledWith("resto-1", {
      tier: "PRO",
      status: "ACTIVE",
    });
  });

  it("processes customer.subscription.created with STARTER priceId", async () => {
    const billingRepo = createMockBillingRepo();
    const useCase = new HandleStripeWebhook(
      billingRepo,
      freeRestaurantRepo(),
      createMockWebhookEventRepo(),
    );

    await useCase.execute({
      ...VALID_INPUT,
      eventType: "customer.subscription.created",
      priceId: STARTER_PRICE_ID,
    });

    expect(billingRepo.updateRestaurantPlan).toHaveBeenCalledWith("resto-1", {
      tier: "STARTER",
      status: "ACTIVE",
    });
  });

  it("processes invoice.payment_failed for ACTIVE restaurant (preserves tier)", async () => {
    const billingRepo = createMockBillingRepo();
    const useCase = new HandleStripeWebhook(
      billingRepo,
      createMockRestaurantRepo({
        getRestaurantById: async () =>
          restaurantFixture({ planStatus: "ACTIVE", planTier: "STARTER" }),
      }),
      createMockWebhookEventRepo(),
    );

    const result = await useCase.execute({
      ...VALID_INPUT,
      eventType: "invoice.payment_failed",
      priceId: null,
    });

    expect(result).toEqual({ status: "processed", slug: "resto-abcd1234" });
    // Sans priceId on conserve le tier courant. Status passe à PAST_DUE.
    expect(billingRepo.updateRestaurantPlan).toHaveBeenCalledWith("resto-1", {
      tier: "STARTER",
      status: "PAST_DUE",
    });
  });

  it("processes customer.subscription.deleted → tier=FREE, status=CANCELED", async () => {
    const billingRepo = createMockBillingRepo();
    const useCase = new HandleStripeWebhook(
      billingRepo,
      createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixture({ planStatus: "ACTIVE", planTier: "PRO" }),
      }),
      createMockWebhookEventRepo(),
    );

    const result = await useCase.execute({
      ...VALID_INPUT,
      eventType: "customer.subscription.deleted",
      priceId: PRO_PRICE_ID, // ignoré : .deleted force FREE
    });

    expect(result).toEqual({ status: "processed", slug: "resto-abcd1234" });
    expect(billingRepo.updateRestaurantPlan).toHaveBeenCalledWith("resto-1", {
      tier: "FREE",
      status: "CANCELED",
    });
  });

  it("skips when priceId is unknown (broken Stripe config)", async () => {
    const billingRepo = createMockBillingRepo();
    const webhookEventRepo = createMockWebhookEventRepo();
    const useCase = new HandleStripeWebhook(billingRepo, freeRestaurantRepo(), webhookEventRepo);

    const result = await useCase.execute({
      ...VALID_INPUT,
      priceId: "price_unknown_xxx",
    });

    expect(result).toEqual({ status: "skipped", reason: "unknown_price_id" });
    expect(billingRepo.upsertBilling).not.toHaveBeenCalled();
    expect(billingRepo.updateRestaurantPlan).not.toHaveBeenCalled();
    expect(webhookEventRepo.markProcessed).toHaveBeenCalled();
  });

  it("skips unhandled event types", async () => {
    const billingRepo = createMockBillingRepo();
    const webhookEventRepo = createMockWebhookEventRepo();
    const useCase = new HandleStripeWebhook(billingRepo, freeRestaurantRepo(), webhookEventRepo);

    const result = await useCase.execute({ ...VALID_INPUT, eventType: "customer.updated" });

    expect(result).toEqual({ status: "skipped", reason: "unhandled_event" });
    expect(billingRepo.upsertBilling).not.toHaveBeenCalled();
    expect(billingRepo.updateRestaurantPlan).not.toHaveBeenCalled();
    expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith("evt_test_123", "customer.updated");
  });

  it("skips when transition is invalid (FREE → PAST_DUE)", async () => {
    const billingRepo = createMockBillingRepo();
    const webhookEventRepo = createMockWebhookEventRepo();
    const useCase = new HandleStripeWebhook(billingRepo, freeRestaurantRepo(), webhookEventRepo);

    const result = await useCase.execute({
      ...VALID_INPUT,
      eventType: "invoice.payment_failed",
      priceId: null,
    });

    expect(result).toEqual({ status: "skipped", reason: "invalid_transition" });
    expect(billingRepo.upsertBilling).not.toHaveBeenCalled();
    expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
      "evt_test_123",
      "invoice.payment_failed",
    );
  });

  it("throws when restaurant not found", async () => {
    const billingRepo = createMockBillingRepo();
    const webhookEventRepo = createMockWebhookEventRepo();
    const useCase = new HandleStripeWebhook(
      billingRepo,
      createMockRestaurantRepo({ getRestaurantById: async () => null }),
      webhookEventRepo,
    );

    await expect(useCase.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "restaurant_not_found",
    });
    expect(billingRepo.upsertBilling).not.toHaveBeenCalled();
    expect(webhookEventRepo.markProcessed).not.toHaveBeenCalled();
  });

  it("returns duplicate when event already processed", async () => {
    const billingRepo = createMockBillingRepo();
    const webhookEventRepo = createMockWebhookEventRepo({
      isAlreadyProcessed: vi.fn(async () => true),
    });
    const useCase = new HandleStripeWebhook(billingRepo, freeRestaurantRepo(), webhookEventRepo);

    const result = await useCase.execute(VALID_INPUT);

    expect(result).toEqual({ status: "duplicate" });
    expect(billingRepo.upsertBilling).not.toHaveBeenCalled();
    expect(billingRepo.updateRestaurantPlan).not.toHaveBeenCalled();
    expect(webhookEventRepo.markProcessed).not.toHaveBeenCalled();
  });
});
