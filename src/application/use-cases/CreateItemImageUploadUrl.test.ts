import { describe, it, expect, vi } from "vitest";
import { CreateItemImageUploadUrl } from "./CreateItemImageUploadUrl";
import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { StorageService } from "@/application/ports/StorageService";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { PlanTier } from "@/domain/billing/PlanPolicy";

const RESTAURANT_FIXTURE = {
  id: "resto-1",
  slug: "resto-abcd1234",
  displayName: "Mon Restaurant",
  planStatus: "ACTIVE" as PlanStatus,
  planTier: "PRO" as PlanTier,
  activationDismissedAt: null,
  logoPath: null,
  brandPrimary: null,
  brandAccent: null,
  brandBackground: null,
};

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

function createMockRestaurantRepo(
  overrides: Partial<RestaurantRepository> = {},
): RestaurantRepository {
  return {
    findByOwnerUserId: async () => null,
    createWithMenuAndCategories: async () => ({ id: "id" }),
    getRestaurantById: async () => RESTAURANT_FIXTURE,
    updateDisplayName: async () => {},
    updateLogoPath: async () => {},
    updateBrandColors: async () => {},
    markActivationDismissed: async () => {},
    delete: async () => {},
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
    const uc = new CreateItemImageUploadUrl(repo, storage, createMockRestaurantRepo());

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
    const uc = new CreateItemImageUploadUrl(repo, storage, createMockRestaurantRepo());

    const out = await uc.execute({ restaurantId: "r", itemId: "i", mime });

    expect(out.path).toBe(`r/i.${ext}`);
  });

  it("throws on unsupported mime", async () => {
    const repo = createMockRepo();
    const storage = createMockStorage();
    const uc = new CreateItemImageUploadUrl(repo, storage, createMockRestaurantRepo());

    await expect(
      uc.execute({ restaurantId: "r", itemId: "i", mime: "image/gif" }),
    ).rejects.toThrow();
    expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("throws when item does not belong to the restaurant", async () => {
    const repo = createMockRepo({ getItem: async () => null });
    const storage = createMockStorage();
    const uc = new CreateItemImageUploadUrl(repo, storage, createMockRestaurantRepo());

    await expect(
      uc.execute({ restaurantId: "r", itemId: "i", mime: "image/jpeg" }),
    ).rejects.toThrow();
    expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("rejects when FREE tier reaches 5 photos quota", async () => {
    const repo = createMockRepo({
      getItem: async () => ({ imagePath: null }),
      countItemsWithImage: async () => 5,
    });
    const storage = createMockStorage();
    const uc = new CreateItemImageUploadUrl(
      repo,
      storage,
      createMockRestaurantRepo({
        getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, planTier: "FREE" }),
      }),
    );

    await expect(
      uc.execute({ restaurantId: "r", itemId: "i", mime: "image/jpeg" }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "max_photos",
      metadata: { limit: 5, current: 5, tier: "FREE" },
    });
    expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("rejects when STARTER tier reaches 20 photos quota", async () => {
    const repo = createMockRepo({
      getItem: async () => ({ imagePath: null }),
      countItemsWithImage: async () => 20,
    });
    const storage = createMockStorage();
    const uc = new CreateItemImageUploadUrl(
      repo,
      storage,
      createMockRestaurantRepo({
        getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, planTier: "STARTER" }),
      }),
    );

    await expect(
      uc.execute({ restaurantId: "r", itemId: "i", mime: "image/jpeg" }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "max_photos",
      metadata: { limit: 20, current: 20, tier: "STARTER" },
    });
  });

  it("PRO tier has no photo cap (countItemsWithImage = 1000 still allowed)", async () => {
    const repo = createMockRepo({
      getItem: async () => ({ imagePath: null }),
      countItemsWithImage: async () => 1000,
    });
    const storage = createMockStorage();
    const uc = new CreateItemImageUploadUrl(repo, storage, createMockRestaurantRepo());

    await expect(
      uc.execute({ restaurantId: "r", itemId: "i", mime: "image/jpeg" }),
    ).resolves.toBeDefined();
  });

  it("does NOT count toward quota when replacing an existing photo (re-upload)", async () => {
    const countSpy = vi.fn(async () => 5); // already at FREE quota
    const repo = createMockRepo({
      getItem: async () => ({ imagePath: "r/i.webp" }), // item already has a photo
      countItemsWithImage: countSpy,
    });
    const storage = createMockStorage();
    const uc = new CreateItemImageUploadUrl(
      repo,
      storage,
      createMockRestaurantRepo({
        getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, planTier: "FREE" }),
      }),
    );

    // Re-upload should succeed even at quota cap.
    await expect(
      uc.execute({ restaurantId: "r", itemId: "i", mime: "image/jpeg" }),
    ).resolves.toBeDefined();
    // Le count n'a même pas besoin d'être appelé puisqu'on skip la check.
    expect(countSpy).not.toHaveBeenCalled();
  });
});
