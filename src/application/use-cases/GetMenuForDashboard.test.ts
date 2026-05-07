import { describe, it, expect } from "vitest";
import { GetMenuForDashboard } from "./GetMenuForDashboard";
import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { MenuOverview } from "@/domain/menu/MenuTypes";

const MENU_FIXTURE: MenuOverview = {
  menuId: "menu-1",
  restaurantId: "resto-1",
  status: "DRAFT",
  publishedAt: null,
  categories: [
    {
      id: "cat-1",
      name: "Entrées",
      order: 0,
      items: [
        {
          id: "item-1",
          priceCents: 850,
          badge: "NEW",
          allergens: [],
          isAvailable: true,
          imagePath: null,
          altTextFr: null,
          altTextEn: null,
          order: 0,
          translations: {
            fr: { name: "Soupe", description: "Soupe du jour" },
            en: { name: "Soup", description: "Soup of the day" },
          },
        },
      ],
    },
    { id: "cat-2", name: "Plats", order: 1, items: [] },
    { id: "cat-3", name: "Desserts", order: 2, items: [] },
    { id: "cat-4", name: "Boissons", order: 3, items: [] },
  ],
};

function createMockRepo(menu: MenuOverview | null): MenuRepository {
  return {
    getMenuByRestaurantId: async () => menu,
    createItem: async () => ({ id: "new-id" }),
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
    listCategoryNames: async () => [],
    createCategory: async () => ({ id: "id" }),
    renameCategory: async () => {},
    deleteCategory: async () => {},
    reorderCategories: async () => {},
    getMenuIdByRestaurantId: async () => "menu-1",
    countItemsWithImage: async () => 0,
  };
}

describe("GetMenuForDashboard", () => {
  it("returns the menu when it exists", async () => {
    const uc = new GetMenuForDashboard(createMockRepo(MENU_FIXTURE));

    const result = await uc.execute({ restaurantId: "resto-1" });

    expect(result).toEqual(MENU_FIXTURE);
  });

  it("throws when menu is not found", async () => {
    const uc = new GetMenuForDashboard(createMockRepo(null));

    await expect(uc.execute({ restaurantId: "unknown" })).rejects.toMatchObject({
      name: "DomainError",
      code: "menu_not_found",
      metadata: { entityId: "unknown" },
    });
  });
});
