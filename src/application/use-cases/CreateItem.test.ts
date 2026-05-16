import { describe, it, expect, vi } from "vitest";
import { CreateItem } from "./CreateItem";
import type { MenuRepository } from "@/application/ports/MenuRepository";

function createMockRepo(overrides: Partial<MenuRepository> = {}): MenuRepository {
  return {
    getMenuByRestaurantId: async () => null,
    createItem: vi.fn(async () => ({ id: "new-item-id" })),
    updateItem: async () => {},
    deleteItem: async () => {},
    getItem: async () => ({ imagePath: null }),
    updateItemImage: async () => {},
    reorderItems: async () => {},
    verifyCategoryOwnership: vi.fn(async () => true),
    verifyMenuOwnership: vi.fn(async () => true),
    getNextItemOrder: vi.fn(async () => 3),
    updateMenuStatus: async () => {},
    markMenuAsDraft: async () => {},
    updateTemplate: async () => {},
    listCategoryNames: vi.fn(async () => []),
    createCategory: vi.fn(async () => ({ id: "new-cat-id" })),
    renameCategory: vi.fn(async () => {}),
    deleteCategory: vi.fn(async () => {}),
    reorderCategories: vi.fn(async () => {}),
    getMenuIdByRestaurantId: vi.fn(async () => "menu-1"),
    countItemsWithImage: async () => 0,
    ...overrides,
  };
}

const VALID_INPUT = {
  categoryId: "cat-1",
  restaurantId: "resto-1",
  priceCents: 1200,
  badge: "NEW" as const,
  translations: {
    fr: { name: "Salade César", description: "Laitue, parmesan" },
    en: { name: "Caesar Salad", description: "Lettuce, parmesan" },
  },
};

describe("CreateItem", () => {
  it("creates an item with valid input", async () => {
    const repo = createMockRepo();
    const uc = new CreateItem(repo);

    const result = await uc.execute(VALID_INPUT);

    expect(result).toEqual({ itemId: "new-item-id" });
    expect(repo.getNextItemOrder).toHaveBeenCalledWith("cat-1");
    expect(repo.createItem).toHaveBeenCalledWith({
      categoryId: "cat-1",
      restaurantId: "resto-1",
      priceCents: 1200,
      badge: "NEW",
      allergens: [],
      isAvailable: true,
      order: 3,
      translations: {
        fr: { name: "Salade César", description: "Laitue, parmesan" },
        en: { name: "Caesar Salad", description: "Lettuce, parmesan" },
      },
    });
  });

  it("propagates allergens to the repo", async () => {
    const repo = createMockRepo();
    const uc = new CreateItem(repo);

    await uc.execute({ ...VALID_INPUT, allergens: ["GLUTEN", "EGGS"] });

    expect(repo.createItem).toHaveBeenCalledWith(
      expect.objectContaining({ allergens: ["GLUTEN", "EGGS"] }),
    );
  });

  it("rejects an invalid allergen value", async () => {
    const uc = new CreateItem(createMockRepo());

    await expect(
      uc.execute({ ...VALID_INPUT, allergens: ["GLUTEN", "PEPPER"] }),
    ).rejects.toMatchObject({ name: "DomainError", code: "invalid_allergen" });
  });

  it("defaults EN translations to empty strings when omitted", async () => {
    const repo = createMockRepo();
    const uc = new CreateItem(repo);

    await uc.execute({
      ...VALID_INPUT,
      translations: {
        fr: { name: "Soupe", description: "Soupe du jour" },
      },
    });

    expect(repo.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        translations: {
          fr: { name: "Soupe", description: "Soupe du jour" },
          en: { name: "", description: "" },
        },
      }),
    );
  });

  it("throws when FR name is empty", async () => {
    const uc = new CreateItem(createMockRepo());

    await expect(
      uc.execute({ ...VALID_INPUT, translations: { fr: { name: "", description: "" } } }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "name_required",
      metadata: { field: "name" },
    });
  });

  it("throws when price is negative", async () => {
    const uc = new CreateItem(createMockRepo());

    await expect(uc.execute({ ...VALID_INPUT, priceCents: -1 })).rejects.toMatchObject({
      name: "DomainError",
      code: "price_too_low",
    });
  });

  it("throws when badge is invalid", async () => {
    const uc = new CreateItem(createMockRepo());

    await expect(uc.execute({ ...VALID_INPUT, badge: "TRENDING" })).rejects.toMatchObject({
      name: "DomainError",
      code: "invalid_badge",
    });
  });

  it("throws when categoryId does not belong to restaurantId", async () => {
    const repo = createMockRepo({
      verifyCategoryOwnership: vi.fn(async () => false),
    });
    const uc = new CreateItem(repo);

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "ownership_mismatch",
    });
    expect(repo.createItem).not.toHaveBeenCalled();
  });

  it("calls verifyCategoryOwnership with correct arguments", async () => {
    const repo = createMockRepo();
    const uc = new CreateItem(repo);

    await uc.execute(VALID_INPUT);

    expect(repo.verifyCategoryOwnership).toHaveBeenCalledWith("cat-1", "resto-1");
  });
});
