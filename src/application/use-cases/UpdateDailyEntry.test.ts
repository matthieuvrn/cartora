import { describe, it, expect, vi } from "vitest";
import { UpdateDailyEntry } from "./UpdateDailyEntry";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { Clock } from "@/application/ports/Clock";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";

const FIXED_NOW = "2026-05-17T12:00:00.000Z";
const clock: Clock = { nowISO: () => FIXED_NOW };

function restaurantOf(tier: PlanTier) {
  return {
    id: "resto-1",
    slug: "resto-abcd1234",
    displayName: "Mon Restaurant",
    planStatus: (tier === "FREE" ? "FREE" : "ACTIVE") as PlanStatus,
    planTier: tier,
    activationDismissedAt: null,
    logoPath: null,
    brandPrimary: null,
    brandAccent: null,
    brandBackground: null,
  };
}

function createMockRestaurantRepo(tier: PlanTier = "STARTER"): RestaurantRepository {
  return {
    findByOwnerUserId: async () => null,
    createWithMenuAndCategories: async () => ({ id: "id" }),
    getRestaurantById: async () => restaurantOf(tier),
    updateDisplayName: async () => {},
    updateLogoPath: async () => {},
    updateBrandColors: async () => {},
    markActivationDismissed: async () => {},
    delete: async () => {},
  };
}

const VALID_INPUT = {
  entryId: "daily-1",
  restaurantId: "resto-1",
  priceCents: 1500,
  badge: "NONE",
  allergens: [] as const,
  validUntilISO: "2026-05-17T20:00:00.000Z",
  translations: { fr: { name: "Pot-au-feu", description: "" } },
};

describe("UpdateDailyEntry", () => {
  it("updates and marks menu as draft for an existing STARTER entry", async () => {
    const updateDailyEntry = vi.fn(async () => {});
    const markMenuAsDraft = vi.fn(async () => {});
    const menuRepo = createMockMenuRepo({
      getDailyEntry: async () => ({ imagePath: null }),
      updateDailyEntry,
      markMenuAsDraft,
    });
    const uc = new UpdateDailyEntry(menuRepo, createMockRestaurantRepo("STARTER"), clock);

    await uc.execute(VALID_INPUT);

    expect(updateDailyEntry).toHaveBeenCalledWith(
      expect.objectContaining({ entryId: "daily-1", priceCents: 1500 }),
    );
    expect(markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("throws item_not_found when the entry does not belong to the restaurant", async () => {
    const menuRepo = createMockMenuRepo({ getDailyEntry: async () => null });
    const uc = new UpdateDailyEntry(menuRepo, createMockRestaurantRepo("STARTER"), clock);

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "item_not_found",
    });
  });

  it("rejects FREE tier", async () => {
    const uc = new UpdateDailyEntry(createMockMenuRepo(), createMockRestaurantRepo("FREE"), clock);

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "daily_menu_not_allowed",
    });
  });

  it("rejects expired validUntil", async () => {
    const uc = new UpdateDailyEntry(
      createMockMenuRepo(),
      createMockRestaurantRepo("STARTER"),
      clock,
    );

    await expect(
      uc.execute({ ...VALID_INPUT, validUntilISO: "2026-05-17T11:00:00.000Z" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "daily_until_in_past" });
  });
});
