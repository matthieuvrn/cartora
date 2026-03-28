import { describe, it, expect, vi } from "vitest";
import { HandleStripeWebhook } from "./HandleStripeWebhook";
import type { BillingRepository } from "@/application/ports/BillingRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";

const RESTAURANT_FIXTURE = {
  id: "resto-1",
  slug: "resto-abcd1234",
  displayName: "Mon Restaurant",
  planStatus: "FREE" as PlanStatus,
};

const VALID_INPUT = {
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
    ...overrides,
  };
}

describe("HandleStripeWebhook", () => {
  it("processes checkout.session.completed for FREE restaurant", async () => {
    const billingRepo = createMockBillingRepo();
    const useCase = new HandleStripeWebhook(billingRepo, createMockRestaurantRepo());

    const result = await useCase.execute(VALID_INPUT);

    expect(result).toEqual({ status: "processed" });
    expect(billingRepo.upsertBilling).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      stripeCustomerId: "cus_abc123",
      stripeSubscriptionId: "sub_xyz789",
    });
    expect(billingRepo.updatePlanStatus).toHaveBeenCalledWith("resto-1", "ACTIVE");
  });

  it("processes invoice.payment_failed for ACTIVE restaurant", async () => {
    const billingRepo = createMockBillingRepo();
    const useCase = new HandleStripeWebhook(
      billingRepo,
      createMockRestaurantRepo({
        getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, planStatus: "ACTIVE" }),
      }),
    );

    const result = await useCase.execute({ ...VALID_INPUT, eventType: "invoice.payment_failed" });

    expect(result).toEqual({ status: "processed" });
    expect(billingRepo.updatePlanStatus).toHaveBeenCalledWith("resto-1", "PAST_DUE");
  });

  it("processes customer.subscription.deleted for ACTIVE restaurant", async () => {
    const billingRepo = createMockBillingRepo();
    const useCase = new HandleStripeWebhook(
      billingRepo,
      createMockRestaurantRepo({
        getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, planStatus: "ACTIVE" }),
      }),
    );

    const result = await useCase.execute({
      ...VALID_INPUT,
      eventType: "customer.subscription.deleted",
    });

    expect(result).toEqual({ status: "processed" });
    expect(billingRepo.updatePlanStatus).toHaveBeenCalledWith("resto-1", "CANCELED");
  });

  it("skips unhandled event types", async () => {
    const billingRepo = createMockBillingRepo();
    const restaurantRepo = createMockRestaurantRepo();
    const useCase = new HandleStripeWebhook(billingRepo, restaurantRepo);

    const result = await useCase.execute({ ...VALID_INPUT, eventType: "customer.updated" });

    expect(result).toEqual({ status: "skipped", reason: "unhandled_event" });
    expect(billingRepo.upsertBilling).not.toHaveBeenCalled();
    expect(billingRepo.updatePlanStatus).not.toHaveBeenCalled();
  });

  it("skips when transition is no_change", async () => {
    const billingRepo = createMockBillingRepo();
    const useCase = new HandleStripeWebhook(
      billingRepo,
      createMockRestaurantRepo({
        getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, planStatus: "ACTIVE" }),
      }),
    );

    const result = await useCase.execute({ ...VALID_INPUT, eventType: "invoice.paid" });

    expect(result).toEqual({ status: "skipped", reason: "no_change" });
    expect(billingRepo.upsertBilling).not.toHaveBeenCalled();
  });

  it("skips when transition is invalid", async () => {
    const billingRepo = createMockBillingRepo();
    const useCase = new HandleStripeWebhook(
      billingRepo,
      createMockRestaurantRepo({
        getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, planStatus: "FREE" }),
      }),
    );

    const result = await useCase.execute({ ...VALID_INPUT, eventType: "invoice.payment_failed" });

    expect(result).toEqual({ status: "skipped", reason: "invalid_transition" });
    expect(billingRepo.upsertBilling).not.toHaveBeenCalled();
  });

  it("throws when restaurant not found", async () => {
    const billingRepo = createMockBillingRepo();
    const useCase = new HandleStripeWebhook(
      billingRepo,
      createMockRestaurantRepo({ getRestaurantById: async () => null }),
    );

    await expect(useCase.execute(VALID_INPUT)).rejects.toThrow("Restaurant introuvable");
    expect(billingRepo.upsertBilling).not.toHaveBeenCalled();
  });
});
