import { describe, it, expect, vi } from "vitest";
import { UpdateBrandColors } from "./UpdateBrandColors";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import {
  createMockRestaurantRepo,
  restaurantFixtureForTier,
} from "./__fixtures__/restaurantRepoMock";
import type { PlanTier } from "@/domain/billing/PlanPolicy";

describe("UpdateBrandColors", () => {
  it("persists normalized hex colors for a PRO restaurant and marks menu as draft", async () => {
    const markMenuAsDraft = vi.fn(async () => {});
    const restaurantRepo = createMockRestaurantRepo();
    const menuRepo = createMockMenuRepo({ markMenuAsDraft });
    const uc = new UpdateBrandColors(restaurantRepo, menuRepo);

    await uc.execute({
      restaurantId: "resto-1",
      primary: "#0C0A09",
      accent: "#FBBF24",
      background: "#FFFFFF",
    });

    expect(restaurantRepo.updateBrandColors).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      primary: "#0c0a09",
      accent: "#fbbf24",
      background: "#ffffff",
    });
    expect(markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("accepts null values to reset to template defaults", async () => {
    const restaurantRepo = createMockRestaurantRepo();
    const menuRepo = createMockMenuRepo();
    const uc = new UpdateBrandColors(restaurantRepo, menuRepo);

    await uc.execute({
      restaurantId: "resto-1",
      primary: null,
      accent: null,
      background: null,
    });

    expect(restaurantRepo.updateBrandColors).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      primary: null,
      accent: null,
      background: null,
    });
  });

  it.each([["FREE" as PlanTier], ["STARTER" as PlanTier]])(
    "rejects %s with branding_not_allowed",
    async (tier) => {
      const restaurantRepo = createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixtureForTier(tier),
      });
      const menuRepo = createMockMenuRepo();
      const uc = new UpdateBrandColors(restaurantRepo, menuRepo);

      await expect(
        uc.execute({
          restaurantId: "resto-1",
          primary: "#000000",
          accent: "#ffffff",
          background: "#ffffff",
        }),
      ).rejects.toMatchObject({ name: "DomainError", code: "branding_not_allowed" });
      expect(restaurantRepo.updateBrandColors).not.toHaveBeenCalled();
    },
  );

  it("throws restaurant_not_found when no restaurant exists", async () => {
    const restaurantRepo = createMockRestaurantRepo({ getRestaurantById: async () => null });
    const menuRepo = createMockMenuRepo();
    const uc = new UpdateBrandColors(restaurantRepo, menuRepo);

    await expect(
      uc.execute({ restaurantId: "resto-1", primary: null, accent: null, background: null }),
    ).rejects.toMatchObject({ name: "DomainError", code: "restaurant_not_found" });
  });

  it("rejects malformed hex colors with invalid_brand_color", async () => {
    const restaurantRepo = createMockRestaurantRepo();
    const menuRepo = createMockMenuRepo();
    const uc = new UpdateBrandColors(restaurantRepo, menuRepo);

    await expect(
      uc.execute({
        restaurantId: "resto-1",
        primary: "not-a-color",
        accent: null,
        background: null,
      }),
    ).rejects.toMatchObject({ name: "DomainError", code: "invalid_brand_color" });
  });

  it("rejects low contrast pair (primary vs background) without force", async () => {
    const restaurantRepo = createMockRestaurantRepo();
    const menuRepo = createMockMenuRepo();
    const uc = new UpdateBrandColors(restaurantRepo, menuRepo);

    await expect(
      uc.execute({
        restaurantId: "resto-1",
        primary: "#ffff00",
        accent: null,
        background: "#ffffff",
      }),
    ).rejects.toMatchObject({ name: "DomainError", code: "low_brand_contrast" });
    expect(restaurantRepo.updateBrandColors).not.toHaveBeenCalled();
  });

  it("accepts low contrast pair when forceLowContrast=true", async () => {
    const restaurantRepo = createMockRestaurantRepo();
    const menuRepo = createMockMenuRepo();
    const uc = new UpdateBrandColors(restaurantRepo, menuRepo);

    await uc.execute({
      restaurantId: "resto-1",
      primary: "#ffff00",
      accent: null,
      background: "#ffffff",
      forceLowContrast: true,
    });

    expect(restaurantRepo.updateBrandColors).toHaveBeenCalled();
  });

  it("skips contrast check when primary or background is null", async () => {
    const restaurantRepo = createMockRestaurantRepo();
    const menuRepo = createMockMenuRepo();
    const uc = new UpdateBrandColors(restaurantRepo, menuRepo);

    await uc.execute({
      restaurantId: "resto-1",
      primary: "#ffff00",
      accent: null,
      background: null,
    });

    expect(restaurantRepo.updateBrandColors).toHaveBeenCalled();
  });
});
