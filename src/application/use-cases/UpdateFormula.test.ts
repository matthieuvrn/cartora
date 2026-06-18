import { describe, it, expect, vi } from "vitest";
import { UpdateFormula } from "./UpdateFormula";
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
  formulaId: "formula-1",
  restaurantId: "resto-1",
  priceCents: 1800,
  validUntilISO: "2026-05-17T20:00:00.000Z",
  sourceLocale: "fr" as const,
  name: "Menu du soir",
  description: "Entrée + Plat",
};

describe("UpdateFormula", () => {
  it("updates and marks menu as draft for an existing STARTER formula (source locale only)", async () => {
    const updateFormula = vi.fn(async () => {});
    const markMenuAsDraft = vi.fn(async () => {});
    const menuRepo = createMockMenuRepo({
      getFormula: async () => ({ id: "formula-1" }),
      updateFormula,
      markMenuAsDraft,
    });
    const uc = new UpdateFormula(menuRepo, restaurantRepoOf("STARTER"), clock);

    await uc.execute(VALID_INPUT);

    expect(updateFormula).toHaveBeenCalledWith({
      formulaId: "formula-1",
      restaurantId: "resto-1",
      priceCents: 1800,
      validUntilISO: "2026-05-17T20:00:00.000Z",
      sourceLocale: "fr",
      texts: { name: "Menu du soir", description: "Entrée + Plat" },
    });
    expect(markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("throws item_not_found when formula does not belong to the restaurant", async () => {
    const menuRepo = createMockMenuRepo({ getFormula: async () => null });
    const uc = new UpdateFormula(menuRepo, restaurantRepoOf("STARTER"), clock);

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "item_not_found",
    });
  });

  it("rejects FREE tier", async () => {
    const uc = new UpdateFormula(createMockMenuRepo(), restaurantRepoOf("FREE"), clock);

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "formula_not_allowed",
    });
  });

  it("rejects expired validUntil", async () => {
    const uc = new UpdateFormula(createMockMenuRepo(), restaurantRepoOf("STARTER"), clock);

    await expect(
      uc.execute({ ...VALID_INPUT, validUntilISO: "2026-05-17T11:00:00.000Z" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "formula_until_in_past" });
  });
});
