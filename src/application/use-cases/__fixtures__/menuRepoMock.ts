import { vi } from "vitest";
import type { MenuRepository } from "@/application/ports/MenuRepository";

/**
 * Default mock implementing every method of MenuRepository as no-op or sensible default.
 * Pass `overrides` to spec specific behaviors per test.
 */
export function createMockMenuRepo(overrides: Partial<MenuRepository> = {}): MenuRepository {
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
    updateTemplate: vi.fn(async () => {}),
    listCategoryNames: vi.fn(async () => []),
    createCategory: vi.fn(async () => ({ id: "new-cat-id" })),
    renameCategory: vi.fn(async () => {}),
    deleteCategory: vi.fn(async () => {}),
    reorderCategories: vi.fn(async () => {}),
    getMenuIdByRestaurantId: vi.fn(async () => "menu-1"),
    countItemsWithImage: vi.fn(async () => 0),
    listDailyDishes: vi.fn(async () => []),
    getDailyDish: vi.fn(async () => ({ imagePath: null })),
    createDailyDish: vi.fn(async () => ({ id: "new-daily-id" })),
    updateDailyDish: vi.fn(async () => {}),
    updateDailyDishImage: vi.fn(async () => {}),
    deleteDailyDish: vi.fn(async () => {}),
    reorderDailyDishes: vi.fn(async () => {}),
    getNextDailyDishOrder: vi.fn(async () => 0),
    listFormulas: vi.fn(async () => []),
    getFormula: vi.fn(async () => ({ id: "formula-1" })),
    createFormula: vi.fn(async () => ({ id: "new-formula-id" })),
    updateFormula: vi.fn(async () => {}),
    deleteFormula: vi.fn(async () => {}),
    reorderFormulas: vi.fn(async () => {}),
    getNextFormulaOrder: vi.fn(async () => 0),
    ...overrides,
  };
}
