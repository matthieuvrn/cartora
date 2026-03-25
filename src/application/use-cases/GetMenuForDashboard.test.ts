import { describe, it, expect } from "vitest";
import { GetMenuForDashboard } from "./GetMenuForDashboard";
import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { MenuOverview } from "@/domain/menu/MenuTypes";

const MENU_FIXTURE: MenuOverview = {
  menuId: "menu-1",
  restaurantId: "resto-1",
  status: "DRAFT",
  categories: [
    {
      id: "cat-1",
      type: "STARTERS",
      order: 0,
      items: [
        {
          id: "item-1",
          priceCents: 850,
          badge: "NEW",
          isAvailable: true,
          order: 0,
          translations: {
            fr: { name: "Soupe", description: "Soupe du jour" },
            en: { name: "Soup", description: "Soup of the day" },
          },
        },
      ],
    },
    { id: "cat-2", type: "MAINS", order: 1, items: [] },
    { id: "cat-3", type: "DESSERTS", order: 2, items: [] },
    { id: "cat-4", type: "DRINKS", order: 3, items: [] },
  ],
};

function createMockRepo(menu: MenuOverview | null): MenuRepository {
  return {
    getMenuByRestaurantId: async () => menu,
    createItem: async () => ({ id: "new-id" }),
    updateItem: async () => {},
    deleteItem: async () => {},
    reorderItems: async () => {},
    getNextItemOrder: async () => 0,
    updateMenuStatus: async () => {},
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

    await expect(uc.execute({ restaurantId: "unknown" })).rejects.toThrow(
      "Menu introuvable",
    );
  });
});
