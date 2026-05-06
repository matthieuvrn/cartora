import { describe, it, expect, vi } from "vitest";
import { CreateCategory } from "./CreateCategory";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { MAX_CATEGORIES } from "@/domain/menu/CategoryPolicy";

const RESTAURANT_FIXTURE = {
  id: "resto-1",
  slug: "resto-abcd1234",
  displayName: "Mon Restaurant",
  planStatus: "ACTIVE" as PlanStatus,
  planTier: "PRO" as PlanTier,
  activationDismissedAt: null,
};

function createMockRestaurantRepo(
  overrides: Partial<RestaurantRepository> = {},
): RestaurantRepository {
  return {
    findByOwnerUserId: async () => null,
    createWithMenuAndCategories: async () => ({ id: "id" }),
    getRestaurantById: async () => RESTAURANT_FIXTURE,
    updateDisplayName: async () => {},
    markActivationDismissed: async () => {},
    delete: async () => {},
    ...overrides,
  };
}

const VALID_INPUT = {
  restaurantId: "resto-1",
  menuId: "menu-1",
  name: "Tapas",
};

describe("CreateCategory", () => {
  it("creates with valid input (PRO tier, no quota cap)", async () => {
    const repo = createMockMenuRepo({
      listCategoryNames: vi.fn(async () => [
        { id: "a", name: "Entrées" },
        { id: "b", name: "Plats" },
      ]),
    });
    const uc = new CreateCategory(repo, createMockRestaurantRepo());

    const result = await uc.execute(VALID_INPUT);

    expect(result).toEqual({ categoryId: "new-cat-id" });
    expect(repo.createCategory).toHaveBeenCalledWith({
      menuId: "menu-1",
      restaurantId: "resto-1",
      name: "Tapas",
      order: 2,
    });
  });

  it("sanitizes the name (trim + collapse spaces)", async () => {
    const repo = createMockMenuRepo();
    const uc = new CreateCategory(repo, createMockRestaurantRepo());

    await uc.execute({ ...VALID_INPUT, name: "  Plats   du   jour  " });

    expect(repo.createCategory).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Plats du jour" }),
    );
  });

  it("refuses empty name", async () => {
    const uc = new CreateCategory(createMockMenuRepo(), createMockRestaurantRepo());
    await expect(uc.execute({ ...VALID_INPUT, name: "  " })).rejects.toThrow(
      "Le nom est obligatoire",
    );
  });

  it("refuses if menu does not belong to restaurant", async () => {
    const repo = createMockMenuRepo({ verifyMenuOwnership: vi.fn(async () => false) });
    const uc = new CreateCategory(repo, createMockRestaurantRepo());

    await expect(uc.execute(VALID_INPUT)).rejects.toThrow(
      "Ce menu n'appartient pas à ce restaurant",
    );
    expect(repo.createCategory).not.toHaveBeenCalled();
  });

  it("refuses on FREE tier when quota reached (6 categories)", async () => {
    const existing = Array.from({ length: 6 }, (_, i) => ({
      id: `c${i}`,
      name: `Cat ${i}`,
    }));
    const repo = createMockMenuRepo({ listCategoryNames: vi.fn(async () => existing) });
    const uc = new CreateCategory(
      repo,
      createMockRestaurantRepo({
        getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, planTier: "FREE" }),
      }),
    );

    await expect(uc.execute(VALID_INPUT)).rejects.toThrow("max_categories_6");
    expect(repo.createCategory).not.toHaveBeenCalled();
  });

  it("refuses on STARTER tier when quota reached (10 categories)", async () => {
    const existing = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      name: `Cat ${i}`,
    }));
    const repo = createMockMenuRepo({ listCategoryNames: vi.fn(async () => existing) });
    const uc = new CreateCategory(
      repo,
      createMockRestaurantRepo({
        getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, planTier: "STARTER" }),
      }),
    );

    await expect(uc.execute(VALID_INPUT)).rejects.toThrow("max_categories_10");
    expect(repo.createCategory).not.toHaveBeenCalled();
  });

  it("allows PRO tier up to absolute MAX_CATEGORIES safety cap", async () => {
    const existing = Array.from({ length: MAX_CATEGORIES }, (_, i) => ({
      id: `c${i}`,
      name: `Cat ${i}`,
    }));
    const repo = createMockMenuRepo({ listCategoryNames: vi.fn(async () => existing) });
    const uc = new CreateCategory(
      repo,
      createMockRestaurantRepo({
        getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, planTier: "PRO" }),
      }),
    );

    await expect(uc.execute(VALID_INPUT)).rejects.toThrow(`max_categories_${MAX_CATEGORIES}`);
  });

  it("refuses duplicate name (case + trim insensitive)", async () => {
    const repo = createMockMenuRepo({
      listCategoryNames: vi.fn(async () => [{ id: "a", name: "Tapas" }]),
    });
    const uc = new CreateCategory(repo, createMockRestaurantRepo());

    await expect(uc.execute({ ...VALID_INPUT, name: "  TAPAS  " })).rejects.toThrow(
      "Une catégorie avec ce nom existe déjà",
    );
    expect(repo.createCategory).not.toHaveBeenCalled();
  });

  it("throws when restaurant not found", async () => {
    const repo = createMockMenuRepo();
    const uc = new CreateCategory(
      repo,
      createMockRestaurantRepo({ getRestaurantById: async () => null }),
    );

    await expect(uc.execute(VALID_INPUT)).rejects.toThrow("Restaurant introuvable");
  });
});
