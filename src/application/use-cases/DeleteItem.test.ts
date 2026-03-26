import { describe, it, expect, vi } from "vitest";
import { DeleteItem } from "./DeleteItem";
import type { MenuRepository } from "@/application/ports/MenuRepository";

function createMockRepo(): MenuRepository {
  return {
    getMenuByRestaurantId: async () => null,
    createItem: async () => ({ id: "id" }),
    updateItem: async () => {},
    deleteItem: vi.fn(async () => {}),
    reorderItems: async () => {},
    getNextItemOrder: async () => 0,
    updateMenuStatus: async () => {},
    markMenuAsDraft: async () => {},
  };
}

describe("DeleteItem", () => {
  it("delegates to repo.deleteItem", async () => {
    const repo = createMockRepo();
    const uc = new DeleteItem(repo);

    await uc.execute({ itemId: "item-1", restaurantId: "resto-1" });

    expect(repo.deleteItem).toHaveBeenCalledWith("item-1", "resto-1");
  });
});
