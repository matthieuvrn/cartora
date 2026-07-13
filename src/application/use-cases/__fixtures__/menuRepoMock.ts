import { vi } from "vitest";
import type { MenuRepository } from "@/application/ports/MenuRepository";

/**
 * Convention d'assertions sur les mocks de cette suite :
 *  - `toEqual(value)` pour les valeurs de retour des use cases.
 *  - `toHaveBeenCalledWith({ ...full payload })` pour les calls de mock : STRICT par
 *    défaut. Le but est de détecter les régressions où un use case enverrait un champ
 *    inattendu (ex : ajout par erreur d'un `auditLog` dans la payload).
 *  - `toMatchObject({ name: "DomainError", code, metadata })` pour les `rejects` de
 *    DomainError — on tolère que la classe Error ait d'autres propriétés (`stack`, etc.).
 *  - `expect.objectContaining` UNIQUEMENT si un champ est intrinsèquement variable
 *    (ID généré, timestamp non-injecté via Clock). Sinon : strict.
 *
 * Toutes les méthodes sont des `vi.fn()` plutôt que de simples async functions afin
 * de permettre `expect(repo.method).not.toHaveBeenCalled()` partout — utile pour
 * vérifier qu'une mutation parasite n'a pas eu lieu.
 */
export function createMockMenuRepo(overrides: Partial<MenuRepository> = {}): MenuRepository {
  return {
    getMenuByRestaurantId: vi.fn(async () => null),
    createItem: vi.fn(async () => ({ id: "new-item-id" })),
    updateItem: vi.fn(async () => {}),
    deleteItem: vi.fn(async () => {}),
    getItem: vi.fn(async () => ({ id: "item-1" })),
    updateItemAvailability: vi.fn(async () => {}),
    reorderItems: vi.fn(async () => {}),
    verifyCategoryOwnership: vi.fn(async () => true),
    verifyMenuOwnership: vi.fn(async () => true),
    getNextItemOrder: vi.fn(async () => 3),
    updateMenuStatus: vi.fn(async () => {}),
    markMenuAsDraft: vi.fn(async () => {}),
    updateTemplate: vi.fn(async () => {}),
    listCategoryNames: vi.fn(async () => []),
    createCategory: vi.fn(async () => ({ id: "new-cat-id" })),
    renameCategory: vi.fn(async () => {}),
    deleteCategory: vi.fn(async () => {}),
    reorderCategories: vi.fn(async () => {}),
    getMenuIdByRestaurantId: vi.fn(async () => "menu-1"),
    getMenuPublishState: vi.fn(async () => ({
      status: "PUBLISHED" as const,
      publishedAt: null,
    })),
    listDailyDishes: vi.fn(async () => []),
    getDailyDish: vi.fn(async () => ({ id: "daily-1" })),
    createDailyDish: vi.fn(async () => ({ id: "new-daily-id" })),
    updateDailyDish: vi.fn(async () => {}),
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
