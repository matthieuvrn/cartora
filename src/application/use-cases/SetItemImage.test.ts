import { describe, it, expect, vi } from "vitest";
import { SetItemImage } from "./SetItemImage";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import { createMockStorageService } from "./__fixtures__/storageServiceMock";

describe("SetItemImage", () => {
  it("persists imagePath + alt text and marks the menu as draft", async () => {
    const repo = createMockMenuRepo();
    const storage = createMockStorageService();
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
    const repo = createMockMenuRepo();
    const storage = createMockStorageService();
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
    const repo = createMockMenuRepo();
    const storage = createMockStorageService();
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
    const repo = createMockMenuRepo({ getItem: async () => null });
    const storage = createMockStorageService();
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
    const repo = createMockMenuRepo({
      getItem: async () => ({ imagePath: "resto-1/item-2.jpg" }),
    });
    const storage = createMockStorageService();
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
    const repo = createMockMenuRepo({
      getItem: async () => ({ imagePath: "resto-1/item-2.webp" }),
    });
    const storage = createMockStorageService();
    const uc = new SetItemImage(repo, storage);

    await uc.execute({
      restaurantId: "resto-1",
      itemId: "item-2",
      imagePath: "resto-1/item-2.webp",
    });

    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("still updates DB when previous file deletion fails", async () => {
    const repo = createMockMenuRepo({
      getItem: async () => ({ imagePath: "resto-1/item-2.jpg" }),
    });
    const storage = createMockStorageService({
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
