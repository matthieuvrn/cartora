import { describe, it, expect, vi } from "vitest";
import { DeleteRestaurantLogo } from "./DeleteRestaurantLogo";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import { createMockRestaurantRepo, restaurantFixture } from "./__fixtures__/restaurantRepoMock";
import { createMockStorageService } from "./__fixtures__/storageServiceMock";

/** Override par défaut : ce test part d'un restaurant qui a déjà un logo. */
const restaurantWithLogoRepo = () =>
  createMockRestaurantRepo({
    getRestaurantById: async () => restaurantFixture({ logoPath: "resto-1/logo.webp" }),
  });

describe("DeleteRestaurantLogo", () => {
  it("removes the logo file, clears DB, and marks the menu as draft", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = restaurantWithLogoRepo();
    const storage = createMockStorageService();
    const uc = new DeleteRestaurantLogo(restaurantRepo, menuRepo, storage);

    await uc.execute({ restaurantId: "resto-1" });

    expect(storage.delete).toHaveBeenCalledWith("resto-1/logo.webp");
    expect(restaurantRepo.updateLogoPath).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      logoPath: null,
    });
    expect(menuRepo.markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("does not call storage when there is no existing logo", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo();
    const storage = createMockStorageService();
    const uc = new DeleteRestaurantLogo(restaurantRepo, menuRepo, storage);

    await uc.execute({ restaurantId: "resto-1" });

    expect(storage.delete).not.toHaveBeenCalled();
    expect(restaurantRepo.updateLogoPath).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      logoPath: null,
    });
  });

  it("throws when restaurant is unknown", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({ getRestaurantById: async () => null });
    const storage = createMockStorageService();
    const uc = new DeleteRestaurantLogo(restaurantRepo, menuRepo, storage);

    await expect(uc.execute({ restaurantId: "resto-1" })).rejects.toMatchObject({
      name: "DomainError",
      code: "restaurant_not_found",
    });
    expect(restaurantRepo.updateLogoPath).not.toHaveBeenCalled();
  });

  it("still clears the DB when storage delete fails", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = restaurantWithLogoRepo();
    const storage = createMockStorageService({
      delete: vi.fn(async () => {
        throw new Error("storage down");
      }),
    });
    const uc = new DeleteRestaurantLogo(restaurantRepo, menuRepo, storage);

    await uc.execute({ restaurantId: "resto-1" });

    expect(restaurantRepo.updateLogoPath).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      logoPath: null,
    });
    expect(menuRepo.markMenuAsDraft).toHaveBeenCalled();
  });
});
