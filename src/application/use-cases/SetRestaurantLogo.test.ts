import { describe, it, expect, vi } from "vitest";
import { SetRestaurantLogo } from "./SetRestaurantLogo";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import { createMockRestaurantRepo, restaurantFixture } from "./__fixtures__/restaurantRepoMock";
import { createMockStorageService } from "./__fixtures__/storageServiceMock";

describe("SetRestaurantLogo", () => {
  it("persists logoPath and marks the menu as draft", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo();
    const storage = createMockStorageService();
    const uc = new SetRestaurantLogo(restaurantRepo, menuRepo, storage);

    await uc.execute({ restaurantId: "resto-1", logoPath: "resto-1/logo.webp" });

    expect(restaurantRepo.updateLogoPath).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      logoPath: "resto-1/logo.webp",
    });
    expect(menuRepo.markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("rejects path that does not start with the restaurant prefix", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo();
    const storage = createMockStorageService();
    const uc = new SetRestaurantLogo(restaurantRepo, menuRepo, storage);

    await expect(
      uc.execute({ restaurantId: "resto-1", logoPath: "resto-evil/logo.webp" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "invalid_image_path" });
    expect(restaurantRepo.updateLogoPath).not.toHaveBeenCalled();
  });

  it("throws when restaurant is unknown", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({ getRestaurantById: async () => null });
    const storage = createMockStorageService();
    const uc = new SetRestaurantLogo(restaurantRepo, menuRepo, storage);

    await expect(
      uc.execute({ restaurantId: "resto-1", logoPath: "resto-1/logo.webp" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "restaurant_not_found" });
  });

  it("deletes the previous logo when extension changes", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({
      getRestaurantById: async () => restaurantFixture({ logoPath: "resto-1/logo.png" }),
    });
    const storage = createMockStorageService();
    const uc = new SetRestaurantLogo(restaurantRepo, menuRepo, storage);

    await uc.execute({ restaurantId: "resto-1", logoPath: "resto-1/logo.webp" });

    expect(storage.delete).toHaveBeenCalledWith("resto-1/logo.png");
    expect(restaurantRepo.updateLogoPath).toHaveBeenCalled();
  });

  it("does NOT delete when path is unchanged (overwrite via upsert)", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({
      getRestaurantById: async () => restaurantFixture({ logoPath: "resto-1/logo.webp" }),
    });
    const storage = createMockStorageService();
    const uc = new SetRestaurantLogo(restaurantRepo, menuRepo, storage);

    await uc.execute({ restaurantId: "resto-1", logoPath: "resto-1/logo.webp" });

    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("still updates the DB when previous file deletion fails", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({
      getRestaurantById: async () => restaurantFixture({ logoPath: "resto-1/logo.png" }),
    });
    const storage = createMockStorageService({
      delete: vi.fn(async () => {
        throw new Error("storage down");
      }),
    });
    const uc = new SetRestaurantLogo(restaurantRepo, menuRepo, storage);

    await uc.execute({ restaurantId: "resto-1", logoPath: "resto-1/logo.webp" });

    expect(restaurantRepo.updateLogoPath).toHaveBeenCalled();
    expect(menuRepo.markMenuAsDraft).toHaveBeenCalled();
  });
});
