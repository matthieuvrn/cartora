import { describe, it, expect, vi } from "vitest";
import { DeleteItem } from "./DeleteItem";
import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { StorageService } from "@/application/ports/StorageService";

function createMockRepo(overrides: Partial<MenuRepository> = {}): MenuRepository {
  return {
    getMenuByRestaurantId: async () => null,
    createItem: async () => ({ id: "id" }),
    updateItem: async () => {},
    deleteItem: vi.fn(async () => {}),
    getItem: async () => ({ imagePath: null }),
    updateItemImage: async () => {},
    reorderItems: async () => {},
    verifyCategoryOwnership: async () => true,
    verifyMenuOwnership: async () => true,
    getNextItemOrder: async () => 0,
    updateMenuStatus: async () => {},
    markMenuAsDraft: async () => {},
    listCategoryNames: async () => [],
    createCategory: async () => ({ id: "id" }),
    renameCategory: async () => {},
    deleteCategory: async () => {},
    reorderCategories: async () => {},
    getMenuIdByRestaurantId: async () => "menu-1",
    countItemsWithImage: async () => 0,
    ...overrides,
  };
}

function createMockStorage(overrides: Partial<StorageService> = {}): StorageService {
  return {
    upload: async () => {},
    getPublicUrl: () => "",
    delete: vi.fn(async () => {}),
    createSignedUploadUrl: async () => ({ uploadUrl: "", token: "", path: "" }),
    deleteByPrefix: async () => {},
    ...overrides,
  };
}

describe("DeleteItem", () => {
  it("delegates to repo.deleteItem when item has no image", async () => {
    const repo = createMockRepo();
    const storage = createMockStorage();
    const uc = new DeleteItem(repo, storage);

    await uc.execute({ itemId: "item-1", restaurantId: "resto-1" });

    expect(storage.delete).not.toHaveBeenCalled();
    expect(repo.deleteItem).toHaveBeenCalledWith({ itemId: "item-1", restaurantId: "resto-1" });
  });

  it("deletes the image from storage before dropping the DB row", async () => {
    const repo = createMockRepo({
      getItem: async () => ({ imagePath: "resto-1/item-1.webp" }),
    });
    const storage = createMockStorage();
    const uc = new DeleteItem(repo, storage);

    await uc.execute({ itemId: "item-1", restaurantId: "resto-1" });

    expect(storage.delete).toHaveBeenCalledWith("resto-1/item-1.webp");
    expect(repo.deleteItem).toHaveBeenCalledWith({ itemId: "item-1", restaurantId: "resto-1" });
  });

  it("still drops the DB row when storage delete fails", async () => {
    const repo = createMockRepo({
      getItem: async () => ({ imagePath: "resto-1/item-1.webp" }),
    });
    const storage = createMockStorage({
      delete: vi.fn(async () => {
        throw new Error("storage down");
      }),
    });
    const uc = new DeleteItem(repo, storage);

    await uc.execute({ itemId: "item-1", restaurantId: "resto-1" });

    expect(repo.deleteItem).toHaveBeenCalledWith({ itemId: "item-1", restaurantId: "resto-1" });
  });

  it("proceeds with DB delete when item is already gone (idempotent path)", async () => {
    const repo = createMockRepo({ getItem: async () => null });
    const storage = createMockStorage();
    const uc = new DeleteItem(repo, storage);

    await uc.execute({ itemId: "item-x", restaurantId: "resto-1" });

    expect(storage.delete).not.toHaveBeenCalled();
    expect(repo.deleteItem).toHaveBeenCalledWith({ itemId: "item-x", restaurantId: "resto-1" });
  });
});
