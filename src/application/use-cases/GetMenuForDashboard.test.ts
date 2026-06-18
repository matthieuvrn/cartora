import { describe, it, expect } from "vitest";
import { GetMenuForDashboard } from "./GetMenuForDashboard";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import type { MenuOverview } from "@/domain/menu/MenuTypes";

const MENU_FIXTURE: MenuOverview = {
  menuId: "menu-1",
  restaurantId: "resto-1",
  status: "DRAFT",
  template: "CLASSIC",
  publishedAt: null,
  sourceLocale: "fr",
  enabledLocales: ["en"],
  categories: [
    {
      id: "cat-1",
      name: "Entrées",
      nameTexts: { fr: "Entrées" },
      order: 0,
      items: [
        {
          id: "item-1",
          priceCents: 850,
          badge: "NEW",
          allergens: [],
          isAvailable: true,
          imagePath: null,
          order: 0,
          translations: {
            fr: { name: "Soupe", description: "Soupe du jour" },
            en: { name: "Soup", description: "Soup of the day" },
          },
          texts: {
            name: { fr: "Soupe", en: "Soup" },
            description: { fr: "Soupe du jour", en: "Soup of the day" },
            altText: {},
          },
        },
      ],
    },
    { id: "cat-2", name: "Plats", nameTexts: { fr: "Plats" }, order: 1, items: [] },
    { id: "cat-3", name: "Desserts", nameTexts: { fr: "Desserts" }, order: 2, items: [] },
    { id: "cat-4", name: "Boissons", nameTexts: { fr: "Boissons" }, order: 3, items: [] },
  ],
};

describe("GetMenuForDashboard", () => {
  it("returns the menu when it exists", async () => {
    const repo = createMockMenuRepo({ getMenuByRestaurantId: async () => MENU_FIXTURE });
    const uc = new GetMenuForDashboard(repo);

    const result = await uc.execute({ restaurantId: "resto-1" });

    expect(result).toEqual(MENU_FIXTURE);
  });

  it("throws when menu is not found", async () => {
    const uc = new GetMenuForDashboard(createMockMenuRepo());

    await expect(uc.execute({ restaurantId: "unknown" })).rejects.toMatchObject({
      name: "DomainError",
      code: "menu_not_found",
      metadata: { entityId: "unknown" },
    });
  });
});
