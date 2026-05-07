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
    await expect(uc.execute({ ...VALID_INPUT, name: "  " })).rejects.toMatchObject({
      name: "DomainError",
      code: "name_required",
      metadata: { field: "name" },
    });
  });

  it("refuses if menu does not belong to restaurant", async () => {
    const repo = createMockMenuRepo({ verifyMenuOwnership: vi.fn(async () => false) });
    const uc = new CreateCategory(repo, createMockRestaurantRepo());

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "ownership_mismatch",
    });
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

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "max_categories",
      metadata: { limit: 6, current: 6, tier: "FREE" },
    });
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

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "max_categories",
      metadata: { limit: 10, current: 10, tier: "STARTER" },
    });
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

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "max_categories",
      metadata: { limit: MAX_CATEGORIES, tier: "PRO" },
    });
  });

  it("refuses duplicate name (case + trim insensitive)", async () => {
    const repo = createMockMenuRepo({
      listCategoryNames: vi.fn(async () => [{ id: "a", name: "Tapas" }]),
    });
    const uc = new CreateCategory(repo, createMockRestaurantRepo());

    await expect(uc.execute({ ...VALID_INPUT, name: "  TAPAS  " })).rejects.toMatchObject({
      name: "DomainError",
      code: "duplicate_name",
    });
    expect(repo.createCategory).not.toHaveBeenCalled();
  });

  it("throws when restaurant not found", async () => {
    const repo = createMockMenuRepo();
    const uc = new CreateCategory(
      repo,
      createMockRestaurantRepo({ getRestaurantById: async () => null }),
    );

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "restaurant_not_found",
    });
  });
});
