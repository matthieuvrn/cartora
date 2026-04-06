import { describe, it, expect, vi } from "vitest";
import { HandleStripeWebhook } from "./HandleStripeWebhook";
import type { BillingRepository } from "@/application/ports/BillingRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { WebhookEventRepository } from "@/application/ports/WebhookEventRepository";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";

const RESTAURANT_FIXTURE = {
  id: "resto-1",
  slug: "resto-abcd1234",
  displayName: "Mon Restaurant",
  planStatus: "FREE" as PlanStatus,
};

const VALID_INPUT = {
  stripeEventId: "evt_test_123",
  eventType: "checkout.session.completed",
  stripeCustomerId: "cus_abc123",
  stripeSubscriptionId: "sub_xyz789",
  restaurantId: "resto-1",
};

function createMockBillingRepo(overrides: Partial<BillingRepository> = {}): BillingRepository {
  return {
    upsertBilling: vi.fn(async () => {}),
    findByRestaurantId: async () => null,
    updatePlanStatus: vi.fn(async () => {}),
    ...overrides,
  };
}

function createMockRestaurantRepo(
  overrides: Partial<RestaurantRepository> = {},
): RestaurantRepository {
  return {
    findByOwnerUserId: async () => null,
    createWithMenuAndCategories: async () => ({ id: "id" }),
    getRestaurantById: async () => RESTAURANT_FIXTURE,
    updateDisplayName: async () => {},
    ...overrides,
  };
}

function createMockWebhookEventRepo(
  overrides: Partial<WebhookEventRepository> = {},
): WebhookEventRepository {
  return {
    isAlreadyProcessed: vi.fn(async () => false),
    markProcessed: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("HandleStripeWebhook", () => {
  it("processes checkout.session.completed for FREE restaurant", async () => {
    const billingRepo = createMockBillingRepo();
    const webhookEventRepo = createMockWebhookEventRepo();
    const useCase = new HandleStripeWebhook(
      billingRepo,
      createMockRestaurantRepo(),
      webhookEventRepo,
    );

    const result = await useCase.execute(VALID_INPUT);

    expect(result).toEqual({ status: "processed", slug: "resto-abcd1234" });
    expect(billingRepo.upsertBilling).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      stripeCustomerId: "cus_abc123",
      stripeSubscriptionId: "sub_xyz789",
    });
    expect(billingRepo.updatePlanStatus).toHaveBeenCalledWith("resto-1", "ACTIVE");
    expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
      "evt_test_123",
      "checkout.session.completed",
    );
  });

  it("processes invoice.payment_failed for ACTIVE restaurant", async () => {
    const billingRepo = createMockBillingRepo();
    const useCase = new HandleStripeWebhook(
      billingRepo,
      createMockRestaurantRepo({
        getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, planStatus: "ACTIVE" }),
      }),
      createMockWebhookEventRepo(),
    );

    const result = await useCase.execute({ ...VALID_INPUT, eventType: "invoice.payment_failed" });

    expect(result).toEqual({ status: "processed", slug: "resto-abcd1234" });
    expect(billingRepo.updatePlanStatus).toHaveBeenCalledWith("resto-1", "PAST_DUE");
  });

  it("processes customer.subscription.deleted for ACTIVE restaurant", async () => {
    const billingRepo = createMockBillingRepo();
    const useCase = new HandleStripeWebhook(
      billingRepo,
      createMockRestaurantRepo({
        getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, planStatus: "ACTIVE" }),
      }),
      createMockWebhookEventRepo(),
    );

    const result = await useCase.execute({
      ...VALID_INPUT,
      eventType: "customer.subscription.deleted",
    });

    expect(result).toEqual({ status: "processed", slug: "resto-abcd1234" });
    expect(billingRepo.updatePlanStatus).toHaveBeenCalledWith("resto-1", "CANCELED");
  });

  it("skips unhandled event types", async () => {
    const billingRepo = createMockBillingRepo();
    const restaurantRepo = createMockRestaurantRepo();
    const webhookEventRepo = createMockWebhookEventRepo();
    const useCase = new HandleStripeWebhook(billingRepo, restaurantRepo, webhookEventRepo);

    const result = await useCase.execute({ ...VALID_INPUT, eventType: "customer.updated" });

    expect(result).toEqual({ status: "skipped", reason: "unhandled_event" });
    expect(billingRepo.upsertBilling).not.toHaveBeenCalled();
    expect(billingRepo.updatePlanStatus).not.toHaveBeenCalled();
    expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith("evt_test_123", "customer.updated");
  });

  it("skips when transition is no_change", async () => {
    const billingRepo = createMockBillingRepo();
    const webhookEventRepo = createMockWebhookEventRepo();
    const useCase = new HandleStripeWebhook(
      billingRepo,
      createMockRestaurantRepo({
        getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, planStatus: "ACTIVE" }),
      }),
      webhookEventRepo,
    );

    const result = await useCase.execute({ ...VALID_INPUT, eventType: "invoice.paid" });

    expect(result).toEqual({ status: "skipped", reason: "no_change" });
    expect(billingRepo.upsertBilling).not.toHaveBeenCalled();
    expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith("evt_test_123", "invoice.paid");
  });

  it("skips when transition is invalid", async () => {
    const billingRepo = createMockBillingRepo();
    const webhookEventRepo = createMockWebhookEventRepo();
    const useCase = new HandleStripeWebhook(
      billingRepo,
      createMockRestaurantRepo({
        getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, planStatus: "FREE" }),
      }),
      webhookEventRepo,
    );

    const result = await useCase.execute({ ...VALID_INPUT, eventType: "invoice.payment_failed" });

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

    await expect(useCase.execute(VALID_INPUT)).rejects.toThrow("Restaurant introuvable");
    expect(billingRepo.upsertBilling).not.toHaveBeenCalled();
    expect(webhookEventRepo.markProcessed).not.toHaveBeenCalled();
  });

  it("returns duplicate when event already processed", async () => {
    const billingRepo = createMockBillingRepo();
    const webhookEventRepo = createMockWebhookEventRepo({
      isAlreadyProcessed: vi.fn(async () => true),
    });
    const useCase = new HandleStripeWebhook(
      billingRepo,
      createMockRestaurantRepo(),
      webhookEventRepo,
    );

    const result = await useCase.execute(VALID_INPUT);

    expect(result).toEqual({ status: "duplicate" });
    expect(billingRepo.upsertBilling).not.toHaveBeenCalled();
    expect(billingRepo.updatePlanStatus).not.toHaveBeenCalled();
    expect(webhookEventRepo.markProcessed).not.toHaveBeenCalled();
  });

  it("calls markProcessed after successful processing", async () => {
    const webhookEventRepo = createMockWebhookEventRepo();
    const useCase = new HandleStripeWebhook(
      createMockBillingRepo(),
      createMockRestaurantRepo(),
      webhookEventRepo,
    );

    await useCase.execute(VALID_INPUT);

    expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith(
      "evt_test_123",
      "checkout.session.completed",
    );
  });

  it("calls markProcessed after skipped processing", async () => {
    const webhookEventRepo = createMockWebhookEventRepo();
    const useCase = new HandleStripeWebhook(
      createMockBillingRepo(),
      createMockRestaurantRepo(),
      webhookEventRepo,
    );

    await useCase.execute({ ...VALID_INPUT, eventType: "customer.updated" });

    expect(webhookEventRepo.markProcessed).toHaveBeenCalledWith("evt_test_123", "customer.updated");
  });

  it("does not call markProcessed when restaurant not found", async () => {
    const webhookEventRepo = createMockWebhookEventRepo();
    const useCase = new HandleStripeWebhook(
      createMockBillingRepo(),
      createMockRestaurantRepo({ getRestaurantById: async () => null }),
      webhookEventRepo,
    );

    await expect(useCase.execute(VALID_INPUT)).rejects.toThrow();
    expect(webhookEventRepo.markProcessed).not.toHaveBeenCalled();
  });
});
