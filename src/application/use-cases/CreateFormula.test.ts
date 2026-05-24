import { describe, it, expect, vi } from "vitest";
import { CreateFormula } from "./CreateFormula";
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
    const uc = new CreateFormula(menuRepo, restaurantRepoOf("STARTER"), clock);

    const result = await uc.execute(VALID_INPUT);

    expect(result.formulaId).toBe("formula-1");
    expect(createFormula).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      menuId: "menu-1",
      priceCents: 1600,
      validUntilISO: "2026-05-17T21:59:59.999Z",
      order: 0,
      translations: {
        fr: { name: "Menu du midi", description: "Entrée au choix\nPlat du jour\nCafé gourmand" },
        en: { name: "", description: "" },
      },
    });
    expect(markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("persists for PRO tier as well", async () => {
    const createFormula = vi.fn(async () => ({ id: "formula-2" }));
    const menuRepo = createMockMenuRepo({ createFormula });
    const uc = new CreateFormula(menuRepo, restaurantRepoOf("PRO"), clock);

    await uc.execute(VALID_INPUT);

    expect(createFormula).toHaveBeenCalled();
  });

  it("defaults validUntil to end-of-day Europe/Paris when omitted", async () => {
    const createFormula = vi.fn(async () => ({ id: "formula-1" }));
    const menuRepo = createMockMenuRepo({ createFormula });
    const uc = new CreateFormula(menuRepo, restaurantRepoOf("PRO"), clock);

    await uc.execute(VALID_INPUT);

    // FIXED_NOW = 2026-05-17 12:00 UTC = 14:00 Paris (CEST). Fin de journée = 21:59:59.999 UTC.
    expect(createFormula).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      menuId: "menu-1",
      priceCents: 1600,
      validUntilISO: "2026-05-17T21:59:59.999Z",
      order: 0,
      translations: {
        fr: { name: "Menu du midi", description: "Entrée au choix\nPlat du jour\nCafé gourmand" },
        en: { name: "", description: "" },
      },
    });
  });

  it("rejects FREE tier with formula_not_allowed", async () => {
    const uc = new CreateFormula(createMockMenuRepo(), restaurantRepoOf("FREE"), clock);

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "formula_not_allowed",
    });
  });

  it("rejects when validUntilISO is in the past", async () => {
    const uc = new CreateFormula(createMockMenuRepo(), restaurantRepoOf("STARTER"), clock);

    await expect(
      uc.execute({ ...VALID_INPUT, validUntilISO: "2026-05-17T11:00:00.000Z" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "formula_until_in_past" });
  });

  it("rejects when validUntilISO is more than 14 days ahead", async () => {
    const uc = new CreateFormula(createMockMenuRepo(), restaurantRepoOf("STARTER"), clock);

    await expect(
      uc.execute({ ...VALID_INPUT, validUntilISO: "2026-06-15T00:00:00.000Z" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "formula_until_too_far" });
  });

  it("rejects when name is empty", async () => {
    const uc = new CreateFormula(createMockMenuRepo(), restaurantRepoOf("STARTER"), clock);

    await expect(
      uc.execute({ ...VALID_INPUT, translations: { fr: { name: "", description: "" } } }),
    ).rejects.toMatchObject({ name: "DomainError", code: "name_required" });
  });

  it("rejects when price is negative", async () => {
    const uc = new CreateFormula(createMockMenuRepo(), restaurantRepoOf("STARTER"), clock);

    await expect(uc.execute({ ...VALID_INPUT, priceCents: -1 })).rejects.toMatchObject({
      name: "DomainError",
      code: "price_too_low",
    });
  });

  it("rejects when restaurant not found", async () => {
    const restaurantRepo = createMockRestaurantRepo({ getRestaurantById: async () => null });
    const uc = new CreateFormula(createMockMenuRepo(), restaurantRepo, clock);

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "restaurant_not_found",
    });
  });
});
