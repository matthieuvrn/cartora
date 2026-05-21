import { describe, it, expect, vi } from "vitest";
import { UpdateItem } from "./UpdateItem";
import type { MenuRepository } from "@/application/ports/MenuRepository";

function createMockRepo(overrides: Partial<MenuRepository> = {}): MenuRepository {
  return {
    getMenuByRestaurantId: async () => null,
    createItem: async () => ({ id: "id" }),
    updateItem: vi.fn(async () => {}),
    deleteItem: async () => {},
    getItem: async () => ({ imagePath: null }),
    updateItemImage: async () => {},
    reorderItems: async () => {},
    verifyCategoryOwnership: async () => true,
    verifyMenuOwnership: async () => true,
    getNextItemOrder: async () => 0,
    updateMenuStatus: async () => {},
    markMenuAsDraft: async () => {},
    updateTemplate: async () => {},
    listCategoryNames: async () => [],
    createCategory: async () => ({ id: "id" }),
    renameCategory: async () => {},
    deleteCategory: async () => {},
    reorderCategories: async () => {},
    getMenuIdByRestaurantId: async () => "menu-1",
    countItemsWithImage: async () => 0,
    listDailyDishes: async () => [],
    getDailyDish: async () => ({ imagePath: null }),
    createDailyDish: async () => ({ id: "id" }),
    updateDailyDish: async () => {},
    updateDailyDishImage: async () => {},
    deleteDailyDish: async () => {},
    reorderDailyDishes: async () => {},
    getNextDailyDishOrder: async () => 0,
    listFormulas: async () => [],
    getFormula: async () => ({ id: "formula-1" }),
    createFormula: async () => ({ id: "formula-id" }),
    updateFormula: async () => {},
    deleteFormula: async () => {},
    reorderFormulas: async () => {},
    getNextFormulaOrder: async () => 0,
    ...overrides,
  };
}

const VALID_INPUT = {
  itemId: "item-1",
  restaurantId: "resto-1",
  priceCents: 1500,
  badge: "POPULAR" as const,
  isAvailable: true,
  translations: {
    fr: { name: "Tartare de bœuf", description: "Servi avec frites" },
    en: { name: "Beef tartare", description: "Served with fries" },
  },
};

describe("UpdateItem", () => {
  it("updates an item with valid input", async () => {
    const repo = createMockRepo();
    const uc = new UpdateItem(repo);

    await uc.execute(VALID_INPUT);

    expect(repo.updateItem).toHaveBeenCalledWith({
      itemId: "item-1",
      restaurantId: "resto-1",
      priceCents: 1500,
      badge: "POPULAR",
      allergens: [],
      isAvailable: true,
      translations: {
        fr: { name: "Tartare de bœuf", description: "Servi avec frites" },
        en: { name: "Beef tartare", description: "Served with fries" },
      },
    });
  });

  it("propagates allergens to the repo", async () => {
    const repo = createMockRepo();
    const uc = new UpdateItem(repo);

    await uc.execute({ ...VALID_INPUT, allergens: ["MILK", "NUTS"] });

    expect(repo.updateItem).toHaveBeenCalledWith(
      expect.objectContaining({ allergens: ["MILK", "NUTS"] }),
    );
  });

  it("rejects an invalid allergen value", async () => {
    const uc = new UpdateItem(createMockRepo());

    await expect(
      uc.execute({ ...VALID_INPUT, allergens: ["MILK", "BANANA"] }),
    ).rejects.toMatchObject({ name: "DomainError", code: "invalid_allergen" });
  });

  it("passes isAvailable false through", async () => {
    const repo = createMockRepo();
    const uc = new UpdateItem(repo);

    await uc.execute({ ...VALID_INPUT, isAvailable: false });

    expect(repo.updateItem).toHaveBeenCalledWith(expect.objectContaining({ isAvailable: false }));
  });

  it("defaults EN translations to empty strings when omitted", async () => {
    const repo = createMockRepo();
    const uc = new UpdateItem(repo);

    await uc.execute({
      ...VALID_INPUT,
      translations: { fr: { name: "Soupe", description: "" } },
    });

    expect(repo.updateItem).toHaveBeenCalledWith(
      expect.objectContaining({
        translations: {
          fr: { name: "Soupe", description: "" },
          en: { name: "", description: "" },
        },
      }),
    );
  });

  it("throws when FR name is empty", async () => {
    const uc = new UpdateItem(createMockRepo());

    await expect(
      uc.execute({ ...VALID_INPUT, translations: { fr: { name: "  ", description: "" } } }),
    ).rejects.toMatchObject({ name: "DomainError", code: "name_required" });
  });

  it("throws when price is negative", async () => {
    const uc = new UpdateItem(createMockRepo());

    await expect(uc.execute({ ...VALID_INPUT, priceCents: -5 })).rejects.toMatchObject({
      name: "DomainError",
      code: "price_too_low",
    });
  });

  it("throws when badge is invalid", async () => {
    const uc = new UpdateItem(createMockRepo());

    await expect(uc.execute({ ...VALID_INPUT, badge: "UNKNOWN" })).rejects.toMatchObject({
      name: "DomainError",
      code: "invalid_badge",
    });
  });
});
