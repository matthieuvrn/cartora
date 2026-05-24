import { describe, it, expect, vi } from "vitest";
import { DeleteItemImage } from "./DeleteItemImage";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import { createMockStorageService } from "./__fixtures__/storageServiceMock";

const repoWithImage = () =>
  createMockMenuRepo({
    getItem: async () => ({ imagePath: "resto-1/item-2.webp" }),
  });

describe("DeleteItemImage", () => {
  it("deletes the storage object and resets DB columns", async () => {
    const repo = repoWithImage();
    const storage = createMockStorageService();
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
    const repo = createMockMenuRepo({ getItem: async () => ({ imagePath: null }) });
    const storage = createMockStorageService();
    const uc = new DeleteItemImage(repo, storage);

    await uc.execute({ restaurantId: "resto-1", itemId: "item-2" });

    expect(storage.delete).not.toHaveBeenCalled();
    expect(repo.updateItemImage).toHaveBeenCalled();
  });

  it("rejects unknown item", async () => {
    const repo = createMockMenuRepo({ getItem: async () => null });
    const storage = createMockStorageService();
    const uc = new DeleteItemImage(repo, storage);

    await expect(uc.execute({ restaurantId: "resto-1", itemId: "item-x" })).rejects.toThrow();
  });

  it("still wipes DB pointer when storage delete fails", async () => {
    const repo = repoWithImage();
    const storage = createMockStorageService({
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
