import { describe, it, expect, vi } from "vitest";
import { DeleteItem } from "./DeleteItem";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import { createMockStorageService } from "./__fixtures__/storageServiceMock";

describe("DeleteItem", () => {
  it("delegates to repo.deleteItem when item has no image", async () => {
    const repo = createMockMenuRepo();
    const storage = createMockStorageService();
    const uc = new DeleteItem(repo, storage);

    await uc.execute({ itemId: "item-1", restaurantId: "resto-1" });

    expect(storage.delete).not.toHaveBeenCalled();
    expect(repo.deleteItem).toHaveBeenCalledWith({ itemId: "item-1", restaurantId: "resto-1" });
  });

  it("deletes the image from storage before dropping the DB row", async () => {
    const repo = createMockMenuRepo({
      getItem: async () => ({ imagePath: "resto-1/item-1.webp" }),
    });
    const storage = createMockStorageService();
    const uc = new DeleteItem(repo, storage);

    await uc.execute({ itemId: "item-1", restaurantId: "resto-1" });

    expect(storage.delete).toHaveBeenCalledWith("resto-1/item-1.webp");
    expect(repo.deleteItem).toHaveBeenCalledWith({ itemId: "item-1", restaurantId: "resto-1" });
  });

  it("still drops the DB row when storage delete fails", async () => {
    const repo = createMockMenuRepo({
      getItem: async () => ({ imagePath: "resto-1/item-1.webp" }),
    });
    const storage = createMockStorageService({
      delete: vi.fn(async () => {
        throw new Error("storage down");
      }),
    });
    const uc = new DeleteItem(repo, storage);

    await uc.execute({ itemId: "item-1", restaurantId: "resto-1" });

    expect(repo.deleteItem).toHaveBeenCalledWith({ itemId: "item-1", restaurantId: "resto-1" });
  });

  it("proceeds with DB delete when item is already gone (idempotent path)", async () => {
    const repo = createMockMenuRepo({ getItem: async () => null });
    const storage = createMockStorageService();
    const uc = new DeleteItem(repo, storage);

    await uc.execute({ itemId: "item-x", restaurantId: "resto-1" });

    expect(storage.delete).not.toHaveBeenCalled();
    expect(repo.deleteItem).toHaveBeenCalledWith({ itemId: "item-x", restaurantId: "resto-1" });
  });
});
