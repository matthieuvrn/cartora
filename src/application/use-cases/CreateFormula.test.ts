import { describe, it, expect, vi } from "vitest";
import { CreateFormula } from "./CreateFormula";
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
  priceCents: 1600,
  translations: {
    fr: { name: "Menu du midi", description: "Entrée au choix\nPlat du jour\nCafé gourmand" },
  },
};

describe("CreateFormula", () => {
  it("persists a new formula for a STARTER restaurant", async () => {
    const createFormula = vi.fn(async () => ({ id: "formula-1" }));
    const markMenuAsDraft = vi.fn(async () => {});
    const menuRepo = createMockMenuRepo({ createFormula, markMenuAsDraft });
    const uc = new CreateFormula(menuRepo, createMockRestaurantRepo("STARTER"), clock);

    const result = await uc.execute(VALID_INPUT);

    expect(result.formulaId).toBe("formula-1");
    expect(createFormula).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: "resto-1",
        menuId: "menu-1",
        priceCents: 1600,
        translations: {
          fr: { name: "Menu du midi", description: "Entrée au choix\nPlat du jour\nCafé gourmand" },
          en: { name: "", description: "" },
        },
      }),
    );
    expect(markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("persists for PRO tier as well", async () => {
    const createFormula = vi.fn(async () => ({ id: "formula-2" }));
    const menuRepo = createMockMenuRepo({ createFormula });
    const uc = new CreateFormula(menuRepo, createMockRestaurantRepo("PRO"), clock);

    await uc.execute(VALID_INPUT);

    expect(createFormula).toHaveBeenCalled();
  });

  it("defaults validUntil to end-of-day Europe/Paris when omitted", async () => {
    const createFormula = vi.fn(async () => ({ id: "formula-1" }));
    const menuRepo = createMockMenuRepo({ createFormula });
    const uc = new CreateFormula(menuRepo, createMockRestaurantRepo("PRO"), clock);

    await uc.execute(VALID_INPUT);

    // FIXED_NOW = 2026-05-17 12:00 UTC = 14:00 Paris (CEST). Fin de journée = 21:59:59.999 UTC.
    expect(createFormula).toHaveBeenCalledWith(
      expect.objectContaining({ validUntilISO: "2026-05-17T21:59:59.999Z" }),
    );
  });

  it("rejects FREE tier with formula_not_allowed", async () => {
    const uc = new CreateFormula(createMockMenuRepo(), createMockRestaurantRepo("FREE"), clock);

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "formula_not_allowed",
    });
  });

  it("rejects when validUntilISO is in the past", async () => {
    const uc = new CreateFormula(createMockMenuRepo(), createMockRestaurantRepo("STARTER"), clock);

    await expect(
      uc.execute({ ...VALID_INPUT, validUntilISO: "2026-05-17T11:00:00.000Z" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "formula_until_in_past" });
  });

  it("rejects when validUntilISO is more than 14 days ahead", async () => {
    const uc = new CreateFormula(createMockMenuRepo(), createMockRestaurantRepo("STARTER"), clock);

    await expect(
      uc.execute({ ...VALID_INPUT, validUntilISO: "2026-06-15T00:00:00.000Z" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "formula_until_too_far" });
  });

  it("rejects when name is empty", async () => {
    const uc = new CreateFormula(createMockMenuRepo(), createMockRestaurantRepo("STARTER"), clock);

    await expect(
      uc.execute({ ...VALID_INPUT, translations: { fr: { name: "", description: "" } } }),
    ).rejects.toMatchObject({ name: "DomainError", code: "name_required" });
  });

  it("rejects when price is negative", async () => {
    const uc = new CreateFormula(createMockMenuRepo(), createMockRestaurantRepo("STARTER"), clock);

    await expect(uc.execute({ ...VALID_INPUT, priceCents: -1 })).rejects.toMatchObject({
      name: "DomainError",
      code: "price_too_low",
    });
  });

  it("rejects when restaurant not found", async () => {
    const restaurantRepo: RestaurantRepository = {
      findByOwnerUserId: async () => null,
      createWithMenuAndCategories: async () => ({ id: "id" }),
      getRestaurantById: async () => null,
      updateDisplayName: async () => {},
      updateLogoPath: async () => {},
      updateBrandColors: async () => {},
      markActivationDismissed: async () => {},
      delete: async () => {},
    };
    const uc = new CreateFormula(createMockMenuRepo(), restaurantRepo, clock);

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "restaurant_not_found",
    });
  });
});
