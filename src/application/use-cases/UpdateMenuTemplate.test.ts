import { describe, it, expect, vi } from "vitest";
import { UpdateMenuTemplate } from "./UpdateMenuTemplate";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { PlanTier } from "@/domain/billing/PlanPolicy";

function createMockRestaurantRepo(
  overrides: Partial<RestaurantRepository> = {},
): RestaurantRepository {
  return {
    findByOwnerUserId: async () => null,
    createWithMenuAndCategories: async () => ({ id: "id" }),
    getRestaurantById: async () => null,
    updateDisplayName: async () => {},
    updateLogoPath: async () => {},
    updateBrandColors: async () => {},
    markActivationDismissed: async () => {},
    delete: async () => {},
    ...overrides,
  };
}

function restaurantOf(tier: PlanTier) {
  return {
    id: "resto-1",
    slug: "resto-x",
    displayName: "Le Test",
    planStatus: tier === "FREE" ? ("FREE" as const) : ("ACTIVE" as const),
    planTier: tier,
    activationDismissedAt: null,
    logoPath: null,
    brandPrimary: null,
    brandAccent: null,
    brandBackground: null,
  };
}

describe("UpdateMenuTemplate", () => {
  it("persists the new template for a PRO restaurant choosing ELEGANT", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({
      getRestaurantById: async () => restaurantOf("PRO"),
    });
    const uc = new UpdateMenuTemplate(menuRepo, restaurantRepo);

    await uc.execute({ restaurantId: "resto-1", template: "ELEGANT" });

    expect(menuRepo.updateTemplate).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      template: "ELEGANT",
    });
  });

  it("persists MODERN for a PRO restaurant", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({
      getRestaurantById: async () => restaurantOf("PRO"),
    });
    const uc = new UpdateMenuTemplate(menuRepo, restaurantRepo);

    await uc.execute({ restaurantId: "resto-1", template: "MODERN" });

    expect(menuRepo.updateTemplate).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      template: "MODERN",
    });
  });

  it("allows CLASSIC for every tier", async () => {
    for (const tier of ["FREE", "STARTER", "PRO"] as const) {
      const menuRepo = createMockMenuRepo();
      const restaurantRepo = createMockRestaurantRepo({
        getRestaurantById: async () => restaurantOf(tier),
      });
      const uc = new UpdateMenuTemplate(menuRepo, restaurantRepo);

      await uc.execute({ restaurantId: "resto-1", template: "CLASSIC" });

      expect(menuRepo.updateTemplate).toHaveBeenCalledWith({
        restaurantId: "resto-1",
        template: "CLASSIC",
      });
    }
  });

  it("refuses ELEGANT for a FREE restaurant", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({
      getRestaurantById: async () => restaurantOf("FREE"),
    });
    const uc = new UpdateMenuTemplate(menuRepo, restaurantRepo);

    await expect(
      uc.execute({ restaurantId: "resto-1", template: "ELEGANT" }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "template_not_allowed",
      metadata: { template: "ELEGANT", tier: "FREE" },
    });
    expect(menuRepo.updateTemplate).not.toHaveBeenCalled();
  });

  it("refuses MODERN for a STARTER restaurant", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({
      getRestaurantById: async () => restaurantOf("STARTER"),
    });
    const uc = new UpdateMenuTemplate(menuRepo, restaurantRepo);

    await expect(uc.execute({ restaurantId: "resto-1", template: "MODERN" })).rejects.toMatchObject(
      {
        name: "DomainError",
        code: "template_not_allowed",
        metadata: { template: "MODERN", tier: "STARTER" },
      },
    );
    expect(menuRepo.updateTemplate).not.toHaveBeenCalled();
  });

  it("throws restaurant_not_found when the restaurant is missing", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({
      getRestaurantById: vi.fn(async () => null),
    });
    const uc = new UpdateMenuTemplate(menuRepo, restaurantRepo);

    await expect(
      uc.execute({ restaurantId: "unknown", template: "CLASSIC" }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "restaurant_not_found",
    });
    expect(menuRepo.updateTemplate).not.toHaveBeenCalled();
  });
});
