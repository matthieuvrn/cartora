import { describe, it, expect, vi } from "vitest";
import { DeleteDailyDish } from "./DeleteDailyDish";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import type { StorageService } from "@/application/ports/StorageService";

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

describe("DeleteDailyDish", () => {
  it("deletes dish and marks menu as draft", async () => {
    const deleteDailyDish = vi.fn(async () => {});
    const markMenuAsDraft = vi.fn(async () => {});
    const menuRepo = createMockMenuRepo({
      getDailyDish: async () => ({ imagePath: null }),
      deleteDailyDish,
      markMenuAsDraft,
    });
    const storage = createMockStorage();
    const uc = new DeleteDailyDish(menuRepo, storage);

    await uc.execute({ dishId: "daily-1", restaurantId: "resto-1" });

    expect(deleteDailyDish).toHaveBeenCalledWith({
      dishId: "daily-1",
      restaurantId: "resto-1",
    });
    expect(markMenuAsDraft).toHaveBeenCalledWith("resto-1");
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("attempts to remove storage object when dish had a photo", async () => {
    const deleteFromStorage = vi.fn(async () => {});
    const menuRepo = createMockMenuRepo({
      getDailyDish: async () => ({ imagePath: "resto-1/daily/daily-1.webp" }),
      deleteDailyDish: async () => {},
    });
    const uc = new DeleteDailyDish(menuRepo, createMockStorage({ delete: deleteFromStorage }));

    await uc.execute({ dishId: "daily-1", restaurantId: "resto-1" });

    expect(deleteFromStorage).toHaveBeenCalledWith("resto-1/daily/daily-1.webp");
  });

  it("still deletes DB row when storage.delete throws (non-fatal)", async () => {
    const deleteDailyDish = vi.fn(async () => {});
    const menuRepo = createMockMenuRepo({
      getDailyDish: async () => ({ imagePath: "resto-1/daily/daily-1.webp" }),
      deleteDailyDish,
    });
    const storage = createMockStorage({
      delete: async () => {
        throw new Error("storage down");
      },
    });
    const uc = new DeleteDailyDish(menuRepo, storage);

    await uc.execute({ dishId: "daily-1", restaurantId: "resto-1" });

    expect(deleteDailyDish).toHaveBeenCalled();
  });

  it("throws item_not_found when dish does not belong to restaurant", async () => {
    const menuRepo = createMockMenuRepo({ getDailyDish: async () => null });
    const uc = new DeleteDailyDish(menuRepo, createMockStorage());

    await expect(uc.execute({ dishId: "daily-1", restaurantId: "resto-1" })).rejects.toMatchObject({
      name: "DomainError",
      code: "item_not_found",
    });
  });
});
