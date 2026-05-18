import { describe, it, expect, vi } from "vitest";
import { SetItemImage } from "./SetItemImage";
import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { StorageService } from "@/application/ports/StorageService";

function createMockRepo(overrides: Partial<MenuRepository> = {}): MenuRepository {
  return {
    getMenuByRestaurantId: async () => null,
    createItem: async () => ({ id: "id" }),
    updateItem: async () => {},
    deleteItem: async () => {},
    getItem: async () => ({ imagePath: null }),
    updateItemImage: vi.fn(async () => {}),
    reorderItems: async () => {},
    verifyCategoryOwnership: async () => true,
    verifyMenuOwnership: async () => true,
    getNextItemOrder: async () => 0,
    updateMenuStatus: async () => {},
    markMenuAsDraft: vi.fn(async () => {}),
    updateTemplate: async () => {},
    listCategoryNames: async () => [],
    createCategory: async () => ({ id: "id" }),
    renameCategory: async () => {},
    deleteCategory: async () => {},
    reorderCategories: async () => {},
    getMenuIdByRestaurantId: async () => "menu-1",
    countItemsWithImage: async () => 0,
    listDailyEntries: async () => [],
    getDailyEntry: async () => ({ imagePath: null }),
    createDailyEntry: async () => ({ id: "id" }),
    updateDailyEntry: async () => {},
    updateDailyEntryImage: async () => {},
    deleteDailyEntry: async () => {},
    reorderDailyEntries: async () => {},
    getNextDailyEntryOrder: async () => 0,
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

describe("SetItemImage", () => {
  it("persists imagePath + alt text and marks the menu as draft", async () => {
    const repo = createMockRepo();
    const storage = createMockStorage();
    const uc = new SetItemImage(repo, storage);

    await uc.execute({
      restaurantId: "resto-1",
      itemId: "item-2",
      imagePath: "resto-1/item-2.webp",
      altTextFr: "  Salade verte  ",
      altTextEn: "Green salad",
    });

    expect(repo.updateItemImage).toHaveBeenCalledWith({
      itemId: "item-2",
      restaurantId: "resto-1",
      imagePath: "resto-1/item-2.webp",
      altTextFr: "Salade verte",
      altTextEn: "Green salad",
    });
    expect(repo.markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("normalizes empty alt text to null", async () => {
    const repo = createMockRepo();
    const storage = createMockStorage();
    const uc = new SetItemImage(repo, storage);

    await uc.execute({
      restaurantId: "resto-1",
      itemId: "item-2",
      imagePath: "resto-1/item-2.webp",
    });

    expect(repo.updateItemImage).toHaveBeenCalledWith({
      itemId: "item-2",
      restaurantId: "resto-1",
      imagePath: "resto-1/item-2.webp",
      altTextFr: null,
      altTextEn: null,
    });
  });

  it("rejects path that does not start with the restaurant prefix", async () => {
    const repo = createMockRepo();
    const storage = createMockStorage();
    const uc = new SetItemImage(repo, storage);

    await expect(
      uc.execute({
        restaurantId: "resto-1",
        itemId: "item-2",
        imagePath: "resto-evil/item-2.webp",
      }),
    ).rejects.toThrow();
    expect(repo.updateItemImage).not.toHaveBeenCalled();
  });

  it("rejects unknown item", async () => {
    const repo = createMockRepo({ getItem: async () => null });
    const storage = createMockStorage();
    const uc = new SetItemImage(repo, storage);

    await expect(
      uc.execute({
        restaurantId: "resto-1",
        itemId: "item-x",
        imagePath: "resto-1/item-x.webp",
      }),
    ).rejects.toThrow();
  });

  it("deletes previous file when path changes (e.g. ext switch)", async () => {
    const repo = createMockRepo({
      getItem: async () => ({ imagePath: "resto-1/item-2.jpg" }),
    });
    const storage = createMockStorage();
    const uc = new SetItemImage(repo, storage);

    await uc.execute({
      restaurantId: "resto-1",
      itemId: "item-2",
      imagePath: "resto-1/item-2.webp",
    });

    expect(storage.delete).toHaveBeenCalledWith("resto-1/item-2.jpg");
    expect(repo.updateItemImage).toHaveBeenCalled();
  });

  it("does NOT delete when the path is unchanged (overwrite via upsert)", async () => {
    const repo = createMockRepo({
      getItem: async () => ({ imagePath: "resto-1/item-2.webp" }),
    });
    const storage = createMockStorage();
    const uc = new SetItemImage(repo, storage);

    await uc.execute({
      restaurantId: "resto-1",
      itemId: "item-2",
      imagePath: "resto-1/item-2.webp",
    });

    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("still updates DB when previous file deletion fails", async () => {
    const repo = createMockRepo({
      getItem: async () => ({ imagePath: "resto-1/item-2.jpg" }),
    });
    const storage = createMockStorage({
      delete: vi.fn(async () => {
        throw new Error("storage down");
      }),
    });
    const uc = new SetItemImage(repo, storage);

    await uc.execute({
      restaurantId: "resto-1",
      itemId: "item-2",
      imagePath: "resto-1/item-2.webp",
    });

    expect(repo.updateItemImage).toHaveBeenCalled();
    expect(repo.markMenuAsDraft).toHaveBeenCalled();
  });
});
