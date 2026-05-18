import { describe, it, expect, vi } from "vitest";
import { DeleteDailyEntry } from "./DeleteDailyEntry";
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

describe("DeleteDailyEntry", () => {
  it("deletes entry and marks menu as draft", async () => {
    const deleteDailyEntry = vi.fn(async () => {});
    const markMenuAsDraft = vi.fn(async () => {});
    const menuRepo = createMockMenuRepo({
      getDailyEntry: async () => ({ imagePath: null }),
      deleteDailyEntry,
      markMenuAsDraft,
    });
    const storage = createMockStorage();
    const uc = new DeleteDailyEntry(menuRepo, storage);

    await uc.execute({ entryId: "daily-1", restaurantId: "resto-1" });

    expect(deleteDailyEntry).toHaveBeenCalledWith({
      entryId: "daily-1",
      restaurantId: "resto-1",
    });
    expect(markMenuAsDraft).toHaveBeenCalledWith("resto-1");
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("attempts to remove storage object when entry had a photo", async () => {
    const deleteFromStorage = vi.fn(async () => {});
    const menuRepo = createMockMenuRepo({
      getDailyEntry: async () => ({ imagePath: "resto-1/daily/daily-1.webp" }),
      deleteDailyEntry: async () => {},
    });
    const uc = new DeleteDailyEntry(menuRepo, createMockStorage({ delete: deleteFromStorage }));

    await uc.execute({ entryId: "daily-1", restaurantId: "resto-1" });

    expect(deleteFromStorage).toHaveBeenCalledWith("resto-1/daily/daily-1.webp");
  });

  it("still deletes DB row when storage.delete throws (non-fatal)", async () => {
    const deleteDailyEntry = vi.fn(async () => {});
    const menuRepo = createMockMenuRepo({
      getDailyEntry: async () => ({ imagePath: "resto-1/daily/daily-1.webp" }),
      deleteDailyEntry,
    });
    const storage = createMockStorage({
      delete: async () => {
        throw new Error("storage down");
      },
    });
    const uc = new DeleteDailyEntry(menuRepo, storage);

    await uc.execute({ entryId: "daily-1", restaurantId: "resto-1" });

    expect(deleteDailyEntry).toHaveBeenCalled();
  });

  it("throws item_not_found when entry does not belong to restaurant", async () => {
    const menuRepo = createMockMenuRepo({ getDailyEntry: async () => null });
    const uc = new DeleteDailyEntry(menuRepo, createMockStorage());

    await expect(uc.execute({ entryId: "daily-1", restaurantId: "resto-1" })).rejects.toMatchObject(
      { name: "DomainError", code: "item_not_found" },
    );
  });
});
