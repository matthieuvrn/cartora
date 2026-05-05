import { describe, it, expect, vi } from "vitest";
import { CreateItemImageUploadUrl } from "./CreateItemImageUploadUrl";
import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { StorageService } from "@/application/ports/StorageService";

function createMockRepo(overrides: Partial<MenuRepository> = {}): MenuRepository {
  return {
    getMenuByRestaurantId: async () => null,
    createItem: async () => ({ id: "id" }),
    updateItem: async () => {},
    deleteItem: async () => {},
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
    ...overrides,
  };
}

function createMockStorage(overrides: Partial<StorageService> = {}): StorageService {
  return {
    upload: async () => {},
    getPublicUrl: () => "",
    delete: async () => {},
    createSignedUploadUrl: vi.fn(async (path: string) => ({
      uploadUrl: `https://upload.test/${path}`,
      token: "token-abc",
      path,
    })),
    deleteByPrefix: async () => {},
    ...overrides,
  };
}

describe("CreateItemImageUploadUrl", () => {
  it("returns a signed URL for the path <restaurantId>/<itemId>.<ext>", async () => {
    const repo = createMockRepo();
    const storage = createMockStorage();
    const uc = new CreateItemImageUploadUrl(repo, storage);

    const out = await uc.execute({
      restaurantId: "resto-1",
      itemId: "item-2",
      mime: "image/webp",
    });

    expect(out.path).toBe("resto-1/item-2.webp");
    expect(storage.createSignedUploadUrl).toHaveBeenCalledWith("resto-1/item-2.webp", 60);
  });

  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ])("maps %s to .%s", async (mime, ext) => {
    const repo = createMockRepo();
    const storage = createMockStorage();
    const uc = new CreateItemImageUploadUrl(repo, storage);

    const out = await uc.execute({ restaurantId: "r", itemId: "i", mime });

    expect(out.path).toBe(`r/i.${ext}`);
  });

  it("throws on unsupported mime", async () => {
    const repo = createMockRepo();
    const storage = createMockStorage();
    const uc = new CreateItemImageUploadUrl(repo, storage);

    await expect(
      uc.execute({ restaurantId: "r", itemId: "i", mime: "image/gif" }),
    ).rejects.toThrow();
    expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("throws when item does not belong to the restaurant", async () => {
    const repo = createMockRepo({ getItem: async () => null });
    const storage = createMockStorage();
    const uc = new CreateItemImageUploadUrl(repo, storage);

    await expect(
      uc.execute({ restaurantId: "r", itemId: "i", mime: "image/jpeg" }),
    ).rejects.toThrow();
    expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
  });
});
