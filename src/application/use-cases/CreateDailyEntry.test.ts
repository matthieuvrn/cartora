import { describe, it, expect, vi } from "vitest";
import { CreateDailyEntry } from "./CreateDailyEntry";
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
  restaurantId: "resto-1",
  priceCents: 1500,
  badge: "NONE",
  allergens: ["GLUTEN", "MILK"] as const,
  translations: { fr: { name: "Pot-au-feu", description: "Plat mijoté" } },
};

describe("CreateDailyEntry", () => {
  it("persists a new daily entry for a STARTER restaurant", async () => {
    const createDailyEntry = vi.fn(async () => ({ id: "daily-1" }));
    const markMenuAsDraft = vi.fn(async () => {});
    const menuRepo = createMockMenuRepo({ createDailyEntry, markMenuAsDraft });
    const uc = new CreateDailyEntry(menuRepo, createMockRestaurantRepo("STARTER"), clock);

    const result = await uc.execute(VALID_INPUT);

    expect(result.entryId).toBe("daily-1");
    expect(createDailyEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: "resto-1",
        menuId: "menu-1",
        priceCents: 1500,
        badge: "NONE",
        allergens: ["GLUTEN", "MILK"],
      }),
    );
    expect(markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("defaults validUntil to end-of-day Europe/Paris when omitted", async () => {
    const createDailyEntry = vi.fn(async () => ({ id: "daily-1" }));
    const menuRepo = createMockMenuRepo({ createDailyEntry });
    const uc = new CreateDailyEntry(menuRepo, createMockRestaurantRepo("PRO"), clock);

    await uc.execute(VALID_INPUT);

    // FIXED_NOW = 2026-05-17 12:00 UTC = 14:00 Paris (CEST). Fin de journée Paris = 21:59:59.999 UTC.
    expect(createDailyEntry).toHaveBeenCalledWith(
      expect.objectContaining({ validUntilISO: "2026-05-17T21:59:59.999Z" }),
    );
  });

  it("rejects FREE tier with daily_menu_not_allowed", async () => {
    const uc = new CreateDailyEntry(createMockMenuRepo(), createMockRestaurantRepo("FREE"), clock);

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "daily_menu_not_allowed",
    });
  });

  it("rejects when validUntilISO is in the past", async () => {
    const uc = new CreateDailyEntry(
      createMockMenuRepo(),
      createMockRestaurantRepo("STARTER"),
      clock,
    );

    await expect(
      uc.execute({ ...VALID_INPUT, validUntilISO: "2026-05-17T11:00:00.000Z" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "daily_until_in_past" });
  });

  it("rejects when name is empty", async () => {
    const uc = new CreateDailyEntry(
      createMockMenuRepo(),
      createMockRestaurantRepo("STARTER"),
      clock,
    );

    await expect(
      uc.execute({ ...VALID_INPUT, translations: { fr: { name: "", description: "" } } }),
    ).rejects.toMatchObject({ name: "DomainError", code: "name_required" });
  });
});
