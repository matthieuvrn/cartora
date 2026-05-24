import { describe, it, expect, vi } from "vitest";
import { CreateItemImageUploadUrl } from "./CreateItemImageUploadUrl";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import { createMockRestaurantRepo, restaurantFixture } from "./__fixtures__/restaurantRepoMock";
import { createMockStorageService } from "./__fixtures__/storageServiceMock";

describe("CreateItemImageUploadUrl", () => {
  it("returns a signed URL for the path <restaurantId>/<itemId>.<ext>", async () => {
    const repo = createMockMenuRepo();
    const storage = createMockStorageService();
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
    const repo = createMockMenuRepo();
    const storage = createMockStorageService();
    const uc = new CreateItemImageUploadUrl(repo, storage, createMockRestaurantRepo());

    const out = await uc.execute({ restaurantId: "r", itemId: "i", mime });

    expect(out.path).toBe(`r/i.${ext}`);
  });

  it("throws on unsupported mime", async () => {
    const repo = createMockMenuRepo();
    const storage = createMockStorageService();
    const uc = new CreateItemImageUploadUrl(repo, storage, createMockRestaurantRepo());

    await expect(
      uc.execute({ restaurantId: "r", itemId: "i", mime: "image/gif" }),
    ).rejects.toThrow();
    expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("throws when item does not belong to the restaurant", async () => {
    const repo = createMockMenuRepo({ getItem: async () => null });
    const storage = createMockStorageService();
    const uc = new CreateItemImageUploadUrl(repo, storage, createMockRestaurantRepo());

    await expect(
      uc.execute({ restaurantId: "r", itemId: "i", mime: "image/jpeg" }),
    ).rejects.toThrow();
    expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("rejects when FREE tier reaches 5 photos quota", async () => {
    const repo = createMockMenuRepo({
      getItem: async () => ({ imagePath: null }),
      countItemsWithImage: async () => 5,
    });
    const storage = createMockStorageService();
    const uc = new CreateItemImageUploadUrl(
      repo,
      storage,
      createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixture({ planTier: "FREE", planStatus: "FREE" }),
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
    const repo = createMockMenuRepo({
      getItem: async () => ({ imagePath: null }),
      countItemsWithImage: async () => 20,
    });
    const storage = createMockStorageService();
    const uc = new CreateItemImageUploadUrl(
      repo,
      storage,
      createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixture({ planTier: "STARTER" }),
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
    const repo = createMockMenuRepo({
      getItem: async () => ({ imagePath: null }),
      countItemsWithImage: async () => 1000,
    });
    const storage = createMockStorageService();
    const uc = new CreateItemImageUploadUrl(repo, storage, createMockRestaurantRepo());

    await expect(
      uc.execute({ restaurantId: "r", itemId: "i", mime: "image/jpeg" }),
    ).resolves.toBeDefined();
  });

  it("does NOT count toward quota when replacing an existing photo (re-upload)", async () => {
    const countItemsWithImage = vi.fn(async () => 5);
    const repo = createMockMenuRepo({
      getItem: async () => ({ imagePath: "r/i.webp" }),
      countItemsWithImage,
    });
    const storage = createMockStorageService();
    const uc = new CreateItemImageUploadUrl(
      repo,
      storage,
      createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixture({ planTier: "FREE", planStatus: "FREE" }),
      }),
    );

    // Re-upload should succeed even at quota cap.
    await expect(
      uc.execute({ restaurantId: "r", itemId: "i", mime: "image/jpeg" }),
    ).resolves.toBeDefined();
    // Le count n'a même pas besoin d'être appelé puisqu'on skip la check.
    expect(countItemsWithImage).not.toHaveBeenCalled();
  });
});
