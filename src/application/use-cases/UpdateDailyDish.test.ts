import { describe, it, expect, vi } from "vitest";
import { UpdateDailyDish } from "./UpdateDailyDish";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import {
  createMockRestaurantRepo,
  restaurantFixtureForTier,
} from "./__fixtures__/restaurantRepoMock";
import type { Clock } from "@/application/ports/Clock";
import type { PlanTier } from "@/domain/billing/PlanPolicy";

const FIXED_NOW = "2026-05-17T12:00:00.000Z";
const clock: Clock = { nowISO: () => FIXED_NOW };

function restaurantRepoOf(tier: PlanTier) {
  return createMockRestaurantRepo({
    getRestaurantById: async () => restaurantFixtureForTier(tier),
  });
}

const VALID_INPUT = {
  dishId: "daily-1",
  restaurantId: "resto-1",
  priceCents: 1500,
  badge: "NONE",
  allergens: [] as const,
  validUntilISO: "2026-05-17T20:00:00.000Z",
  translations: { fr: { name: "Pot-au-feu", description: "" } },
};

describe("UpdateDailyDish", () => {
  it("updates and marks menu as draft for an existing STARTER dish", async () => {
    const updateDailyDish = vi.fn(async () => {});
    const markMenuAsDraft = vi.fn(async () => {});
    const menuRepo = createMockMenuRepo({
      getDailyDish: async () => ({ imagePath: null }),
      updateDailyDish,
      markMenuAsDraft,
    });
    const uc = new UpdateDailyDish(menuRepo, restaurantRepoOf("STARTER"), clock);

    await uc.execute(VALID_INPUT);

    expect(updateDailyDish).toHaveBeenCalledWith({
      dishId: "daily-1",
      restaurantId: "resto-1",
      priceCents: 1500,
      badge: "NONE",
      allergens: [],
      validUntilISO: "2026-05-17T20:00:00.000Z",
      translations: {
        fr: { name: "Pot-au-feu", description: "" },
        en: { name: "", description: "" },
      },
    });
    expect(markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("throws item_not_found when the dish does not belong to the restaurant", async () => {
    const menuRepo = createMockMenuRepo({ getDailyDish: async () => null });
    const uc = new UpdateDailyDish(menuRepo, restaurantRepoOf("STARTER"), clock);

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "item_not_found",
    });
  });

  it("rejects FREE tier", async () => {
    const uc = new UpdateDailyDish(createMockMenuRepo(), restaurantRepoOf("FREE"), clock);

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "daily_dishes_not_allowed",
    });
  });

  it("rejects expired validUntil", async () => {
    const uc = new UpdateDailyDish(createMockMenuRepo(), restaurantRepoOf("STARTER"), clock);

    await expect(
      uc.execute({ ...VALID_INPUT, validUntilISO: "2026-05-17T11:00:00.000Z" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "daily_dish_until_in_past" });
  });
});
