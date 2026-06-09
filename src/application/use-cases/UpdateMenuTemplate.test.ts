import { describe, it, expect } from "vitest";
import { UpdateMenuTemplate } from "./UpdateMenuTemplate";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import {
  createMockRestaurantRepo,
  restaurantFixtureForTier,
} from "./__fixtures__/restaurantRepoMock";

describe("UpdateMenuTemplate", () => {
  it("persists the new template for a PRO restaurant choosing NOIR", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({
      getRestaurantById: async () => restaurantFixtureForTier("PRO"),
    });
    const uc = new UpdateMenuTemplate(menuRepo, restaurantRepo);

    await uc.execute({ restaurantId: "resto-1", template: "NOIR" });

    expect(menuRepo.updateTemplate).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      template: "NOIR",
    });
  });

  it("persists BISTRO for a PRO restaurant", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({
      getRestaurantById: async () => restaurantFixtureForTier("PRO"),
    });
    const uc = new UpdateMenuTemplate(menuRepo, restaurantRepo);

    await uc.execute({ restaurantId: "resto-1", template: "BISTRO" });

    expect(menuRepo.updateTemplate).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      template: "BISTRO",
    });
  });

  it("allows CLASSIC for every tier", async () => {
    for (const tier of ["FREE", "STARTER", "PRO"] as const) {
      const menuRepo = createMockMenuRepo();
      const restaurantRepo = createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixtureForTier(tier),
      });
      const uc = new UpdateMenuTemplate(menuRepo, restaurantRepo);

      await uc.execute({ restaurantId: "resto-1", template: "CLASSIC" });

      expect(menuRepo.updateTemplate).toHaveBeenCalledWith({
        restaurantId: "resto-1",
        template: "CLASSIC",
      });
    }
  });

  it("refuses NOIR for a FREE restaurant", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({
      getRestaurantById: async () => restaurantFixtureForTier("FREE"),
    });
    const uc = new UpdateMenuTemplate(menuRepo, restaurantRepo);

    await expect(uc.execute({ restaurantId: "resto-1", template: "NOIR" })).rejects.toMatchObject({
      name: "DomainError",
      code: "template_not_allowed",
      metadata: { template: "NOIR", tier: "FREE" },
    });
    expect(menuRepo.updateTemplate).not.toHaveBeenCalled();
  });

  it("refuses BISTRO for a STARTER restaurant", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({
      getRestaurantById: async () => restaurantFixtureForTier("STARTER"),
    });
    const uc = new UpdateMenuTemplate(menuRepo, restaurantRepo);

    await expect(uc.execute({ restaurantId: "resto-1", template: "BISTRO" })).rejects.toMatchObject(
      {
        name: "DomainError",
        code: "template_not_allowed",
        metadata: { template: "BISTRO", tier: "STARTER" },
      },
    );
    expect(menuRepo.updateTemplate).not.toHaveBeenCalled();
  });

  it("throws restaurant_not_found when the restaurant is missing", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({ getRestaurantById: async () => null });
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
