import { describe, it, expect, vi } from "vitest";
import { DeleteItemImage } from "./DeleteItemImage";
import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { StorageService } from "@/application/ports/StorageService";

function createMockRepo(overrides: Partial<MenuRepository> = {}): MenuRepository {
  return {
    getMenuByRestaurantId: async () => null,
    createItem: async () => ({ id: "id" }),
    updateItem: async () => {},
    deleteItem: async () => {},
    getItem: async () => ({ imagePath: "resto-1/item-2.webp" }),
    updateItemImage: vi.fn(async () => {}),
    reorderItems: async () => {},
    verifyCategoryOwnership: async () => true,
    verifyMenuOwnership: async () => true,
    getNextItemOrder: async () => 0,
    updateMenuStatus: async () => {},
    markMenuAsDraft: vi.fn(async () => {}),
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

describe("DeleteItemImage", () => {
  it("deletes the storage object and resets DB columns", async () => {
    const repo = createMockRepo();
    const storage = createMockStorage();
    const uc = new DeleteItemImage(repo, storage);

    await uc.execute({ restaurantId: "resto-1", itemId: "item-2" });

    expect(storage.delete).toHaveBeenCalledWith("resto-1/item-2.webp");
    expect(repo.updateItemImage).toHaveBeenCalledWith({
      itemId: "item-2",
      restaurantId: "resto-1",
      imagePath: null,
      altTextFr: null,
      altTextEn: null,
    });
    expect(repo.markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("skips storage call when item has no image", async () => {
    const repo = createMockRepo({ getItem: async () => ({ imagePath: null }) });
    const storage = createMockStorage();
    const uc = new DeleteItemImage(repo, storage);

    await uc.execute({ restaurantId: "resto-1", itemId: "item-2" });

    expect(storage.delete).not.toHaveBeenCalled();
    expect(repo.updateItemImage).toHaveBeenCalled();
  });

  it("rejects unknown item", async () => {
    const repo = createMockRepo({ getItem: async () => null });
    const storage = createMockStorage();
    const uc = new DeleteItemImage(repo, storage);

    await expect(uc.execute({ restaurantId: "resto-1", itemId: "item-x" })).rejects.toThrow();
  });

  it("still wipes DB pointer when storage delete fails", async () => {
    const repo = createMockRepo();
    const storage = createMockStorage({
      delete: vi.fn(async () => {
        throw new Error("storage down");
      }),
    });
    const uc = new DeleteItemImage(repo, storage);

    await uc.execute({ restaurantId: "resto-1", itemId: "item-2" });

    expect(repo.updateItemImage).toHaveBeenCalled();
    expect(repo.markMenuAsDraft).toHaveBeenCalled();
  });
});
