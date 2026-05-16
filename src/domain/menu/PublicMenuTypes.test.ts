import { describe, it, expect } from "vitest";
import { buildPublicSnapshot } from "./PublicMenuTypes";
import type { MenuOverview, MenuItemData, MenuCategoryData } from "./MenuTypes";

function makeItem(overrides: Partial<MenuItemData> = {}): MenuItemData {
  return {
    id: "item-1",
    priceCents: 1200,
    badge: "NONE",
    allergens: [],
    isAvailable: true,
    imagePath: null,
    altTextFr: null,
    altTextEn: null,
    order: 0,
    translations: {
      fr: { name: "Salade", description: "Fraîche" },
      en: { name: "Salad", description: "Fresh" },
    },
    ...overrides,
  };
}

function makeCategory(overrides: Partial<MenuCategoryData> = {}): MenuCategoryData {
  return {
    id: "cat-1",
    name: "Entrées",
    order: 0,
    items: [makeItem()],
    ...overrides,
  };
}

function makeMenu(overrides: Partial<MenuOverview> = {}): MenuOverview {
  return {
    menuId: "menu-1",
    restaurantId: "resto-1",
    status: "DRAFT",
    template: "CLASSIC",
    publishedAt: null,
    categories: [makeCategory()],
    ...overrides,
  };
}

const PUBLISHED_AT = "2026-03-25T12:00:00.000Z";

describe("buildPublicSnapshot", () => {
  it("builds snapshot with flattened translations", () => {
    const result = buildPublicSnapshot(makeMenu(), "Mon Restaurant", PUBLISHED_AT);

    expect(result).toEqual({
      restaurantName: "Mon Restaurant",
      publishedAt: PUBLISHED_AT,
      template: "CLASSIC",
      categories: [
        {
          name: "Entrées",
          items: [
            {
              nameFr: "Salade",
              nameEn: "Salad",
              descriptionFr: "Fraîche",
              descriptionEn: "Fresh",
              priceCents: 1200,
              badge: "NONE",
              allergens: [],
              imagePath: null,
              altTextFr: "",
              altTextEn: "",
            },
          ],
        },
      ],
    });
  });

  it("filters out unavailable items", () => {
    const menu = makeMenu({
      categories: [
        makeCategory({
          items: [
            makeItem({ id: "1", order: 0, isAvailable: true }),
            makeItem({ id: "2", order: 1, isAvailable: false }),
            makeItem({ id: "3", order: 2, isAvailable: true }),
          ],
        }),
      ],
    });

    const result = buildPublicSnapshot(menu, "R", PUBLISHED_AT);
    expect(result.categories[0].items).toHaveLength(2);
  });

  it("excludes categories where all items are unavailable", () => {
    const menu = makeMenu({
      categories: [
        makeCategory({
          name: "Entrées",
          items: [makeItem({ isAvailable: false })],
        }),
        makeCategory({
          id: "cat-2",
          name: "Plats",
          items: [makeItem({ isAvailable: true })],
        }),
      ],
    });

    const result = buildPublicSnapshot(menu, "R", PUBLISHED_AT);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].name).toBe("Plats");
  });

  it("returns empty categories array when no items exist", () => {
    const menu = makeMenu({
      categories: [
        makeCategory({ items: [] }),
        makeCategory({ id: "cat-2", name: "Plats", items: [] }),
      ],
    });

    const result = buildPublicSnapshot(menu, "R", PUBLISHED_AT);
    expect(result.categories).toEqual([]);
  });

  it("preserves item order within categories", () => {
    const menu = makeMenu({
      categories: [
        makeCategory({
          items: [
            makeItem({
              id: "1",
              order: 0,
              priceCents: 100,
              translations: {
                fr: { name: "Premier", description: "" },
                en: { name: "First", description: "" },
              },
            }),
            makeItem({
              id: "2",
              order: 1,
              priceCents: 200,
              translations: {
                fr: { name: "Deuxième", description: "" },
                en: { name: "Second", description: "" },
              },
            }),
          ],
        }),
      ],
    });

    const result = buildPublicSnapshot(menu, "R", PUBLISHED_AT);
    expect(result.categories[0].items[0].nameFr).toBe("Premier");
    expect(result.categories[0].items[1].nameFr).toBe("Deuxième");
  });

  it("maps all translation fields correctly", () => {
    const menu = makeMenu({
      categories: [
        makeCategory({
          items: [
            makeItem({
              translations: {
                fr: { name: "Nom FR", description: "Desc FR" },
                en: { name: "Name EN", description: "Desc EN" },
              },
            }),
          ],
        }),
      ],
    });

    const result = buildPublicSnapshot(menu, "R", PUBLISHED_AT);
    const item = result.categories[0].items[0];
    expect(item.nameFr).toBe("Nom FR");
    expect(item.nameEn).toBe("Name EN");
    expect(item.descriptionFr).toBe("Desc FR");
    expect(item.descriptionEn).toBe("Desc EN");
  });

  it("includes multiple categories with items", () => {
    const menu = makeMenu({
      categories: [
        makeCategory({
          name: "Entrées",
          items: [makeItem({ id: "1" })],
        }),
        makeCategory({
          id: "cat-2",
          name: "Desserts",
          items: [makeItem({ id: "2", priceCents: 800, badge: "NEW" })],
        }),
      ],
    });

    const result = buildPublicSnapshot(menu, "R", PUBLISHED_AT);
    expect(result.categories).toHaveLength(2);
    expect(result.categories[0].name).toBe("Entrées");
    expect(result.categories[1].name).toBe("Desserts");
    expect(result.categories[1].items[0].badge).toBe("NEW");
  });
});
