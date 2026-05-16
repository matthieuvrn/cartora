import { describe, it, expect, vi } from "vitest";
import { ReorderItems } from "./ReorderItems";
import type { MenuRepository } from "@/application/ports/MenuRepository";

function createMockRepo(): MenuRepository {
  return {
    getMenuByRestaurantId: async () => null,
    createItem: async () => ({ id: "id" }),
    updateItem: async () => {},
    deleteItem: async () => {},
    getItem: async () => ({ imagePath: null }),
    updateItemImage: async () => {},
    reorderItems: vi.fn(async () => {}),
    verifyCategoryOwnership: vi.fn(async () => true),
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
  };
}

describe("ReorderItems", () => {
  it("delegates ordered list to repo", async () => {
    const repo = createMockRepo();
    const uc = new ReorderItems(repo);

    await uc.execute({
      categoryId: "cat-1",
      restaurantId: "resto-1",
      itemIds: ["item-3", "item-1", "item-2"],
    });

    expect(repo.reorderItems).toHaveBeenCalledWith({
      categoryId: "cat-1",
      restaurantId: "resto-1",
      itemIds: ["item-3", "item-1", "item-2"],
    });
  });

  it("throws when itemIds is empty", async () => {
    const uc = new ReorderItems(createMockRepo());

    await expect(
      uc.execute({ categoryId: "cat-1", restaurantId: "resto-1", itemIds: [] }),
    ).rejects.toMatchObject({ name: "DomainError", code: "empty_list" });
  });

  it("throws when categoryId does not belong to restaurantId", async () => {
    const repo = createMockRepo();
    repo.verifyCategoryOwnership = vi.fn(async () => false);
    const uc = new ReorderItems(repo);

    await expect(
      uc.execute({ categoryId: "cat-1", restaurantId: "resto-1", itemIds: ["item-1"] }),
    ).rejects.toMatchObject({ name: "DomainError", code: "ownership_mismatch" });
    expect(repo.reorderItems).not.toHaveBeenCalled();
  });
});
