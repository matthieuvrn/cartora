import { describe, it, expect, vi } from "vitest";
import { SetRestaurantLogo } from "./SetRestaurantLogo";
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
  logoPath: null as string | null,
  brandPrimary: null as string | null,
  brandAccent: null as string | null,
  brandBackground: null as string | null,
};

function createMockMenuRepo(overrides: Partial<MenuRepository> = {}): MenuRepository {
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
    markMenuAsDraft: vi.fn(async () => {}),
    updateTemplate: async () => {},
    listCategoryNames: async () => [],
    createCategory: async () => ({ id: "id" }),
    renameCategory: async () => {},
    deleteCategory: async () => {},
    reorderCategories: async () => {},
    getMenuIdByRestaurantId: async () => "menu-1",
    countItemsWithImage: async () => 0,
    listDailyDishes: async () => [],
    getDailyDish: async () => ({ imagePath: null }),
    createDailyDish: async () => ({ id: "id" }),
    updateDailyDish: async () => {},
    updateDailyDishImage: async () => {},
    deleteDailyDish: async () => {},
    reorderDailyDishes: async () => {},
    getNextDailyDishOrder: async () => 0,
    listFormulas: async () => [],
    getFormula: async () => ({ id: "formula-1" }),
    createFormula: async () => ({ id: "formula-id" }),
    updateFormula: async () => {},
    deleteFormula: async () => {},
    reorderFormulas: async () => {},
    getNextFormulaOrder: async () => 0,
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
    updateLogoPath: vi.fn(async () => {}),
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
    delete: vi.fn(async () => {}),
    createSignedUploadUrl: async () => ({ uploadUrl: "", token: "", path: "" }),
    deleteByPrefix: async () => {},
    ...overrides,
  };
}

describe("SetRestaurantLogo", () => {
  it("persists logoPath and marks the menu as draft", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo();
    const storage = createMockStorage();
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
    const storage = createMockStorage();
    const uc = new SetRestaurantLogo(restaurantRepo, menuRepo, storage);

    await expect(
      uc.execute({ restaurantId: "resto-1", logoPath: "resto-evil/logo.webp" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "invalid_image_path" });
    expect(restaurantRepo.updateLogoPath).not.toHaveBeenCalled();
  });

  it("throws when restaurant is unknown", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({ getRestaurantById: async () => null });
    const storage = createMockStorage();
    const uc = new SetRestaurantLogo(restaurantRepo, menuRepo, storage);

    await expect(
      uc.execute({ restaurantId: "resto-1", logoPath: "resto-1/logo.webp" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "restaurant_not_found" });
  });

  it("deletes the previous logo when extension changes", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({
      getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, logoPath: "resto-1/logo.png" }),
    });
    const storage = createMockStorage();
    const uc = new SetRestaurantLogo(restaurantRepo, menuRepo, storage);

    await uc.execute({ restaurantId: "resto-1", logoPath: "resto-1/logo.webp" });

    expect(storage.delete).toHaveBeenCalledWith("resto-1/logo.png");
    expect(restaurantRepo.updateLogoPath).toHaveBeenCalled();
  });

  it("does NOT delete when path is unchanged (overwrite via upsert)", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({
      getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, logoPath: "resto-1/logo.webp" }),
    });
    const storage = createMockStorage();
    const uc = new SetRestaurantLogo(restaurantRepo, menuRepo, storage);

    await uc.execute({ restaurantId: "resto-1", logoPath: "resto-1/logo.webp" });

    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("still updates the DB when previous file deletion fails", async () => {
    const menuRepo = createMockMenuRepo();
    const restaurantRepo = createMockRestaurantRepo({
      getRestaurantById: async () => ({ ...RESTAURANT_FIXTURE, logoPath: "resto-1/logo.png" }),
    });
    const storage = createMockStorage({
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
