import { describe, it, expect } from "vitest";
import { buildPublicSnapshot, normalizePublicSnapshot } from "./PublicMenuTypes";
import type { PublicMenuSnapshot } from "./PublicMenuTypes";
import type { MenuOverview, MenuItemData, MenuCategoryData } from "./MenuTypes";

function makeItem(overrides: Partial<MenuItemData> = {}): MenuItemData {
  return {
    id: "item-1",
    priceCents: 1200,
    badge: "NONE",
    allergens: [],
    isAvailable: true,
    order: 0,
    translations: {
      fr: { name: "Salade", description: "Fraîche" },
      en: { name: "Salad", description: "Fresh" },
    },
    texts: {
      name: { fr: "Salade", en: "Salad" },
      description: { fr: "Fraîche", en: "Fresh" },
    },
    ...overrides,
  };
}

function makeCategory(overrides: Partial<MenuCategoryData> = {}): MenuCategoryData {
  return {
    id: "cat-1",
    name: "Entrées",
    nameTexts: { fr: "Entrées" },
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
    sourceLocale: "fr",
    enabledLocales: ["en"],
    categories: [makeCategory()],
    ...overrides,
  };
}

const PUBLISHED_AT = "2026-03-25T12:00:00.000Z";

describe("buildPublicSnapshot", () => {
  it("builds a v2 snapshot with localized texts", () => {
    const result = buildPublicSnapshot(makeMenu(), "Mon Restaurant", PUBLISHED_AT);

    expect(result).toEqual({
      snapshotVersion: 2,
      sourceLocale: "fr",
      availableLocales: ["fr", "en"],
      restaurantName: "Mon Restaurant",
      publishedAt: PUBLISHED_AT,
      template: "CLASSIC",
      categories: [
        {
          name: "Entrées",
          texts: { name: { fr: "Entrées" } },
          items: [
            {
              texts: {
                name: { fr: "Salade", en: "Salad" },
                description: { fr: "Fraîche", en: "Fresh" },
              },
              priceCents: 1200,
              badge: "NONE",
              allergens: [],
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
              texts: { name: { fr: "Premier" }, description: {} },
            }),
            makeItem({
              id: "2",
              order: 1,
              priceCents: 200,
              texts: { name: { fr: "Deuxième" }, description: {} },
            }),
          ],
        }),
      ],
    });

    const result = buildPublicSnapshot(menu, "R", PUBLISHED_AT);
    expect(result.categories[0].items[0].texts.name.fr).toBe("Premier");
    expect(result.categories[0].items[1].texts.name.fr).toBe("Deuxième");
  });

  it("maps all localized texts correctly (source + target locale)", () => {
    const menu = makeMenu({
      categories: [
        makeCategory({
          items: [
            makeItem({
              texts: {
                name: { fr: "Nom FR", en: "Name EN" },
                description: { fr: "Desc FR", en: "Desc EN" },
              },
            }),
          ],
        }),
      ],
    });

    const result = buildPublicSnapshot(menu, "R", PUBLISHED_AT);
    const item = result.categories[0].items[0];
    expect(item.texts).toEqual({
      name: { fr: "Nom FR", en: "Name EN" },
      description: { fr: "Desc FR", en: "Desc EN" },
    });
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

describe("normalizePublicSnapshot", () => {
  it("forces snapshotVersion to 2 and fills allergens defensively on items", () => {
    // Colonne JSON non typée : un item sans `allergens` ne doit pas casser le rendu.
    const snapshot = {
      sourceLocale: "fr",
      availableLocales: ["fr", "en"],
      restaurantName: "R",
      publishedAt: PUBLISHED_AT,
      categories: [
        {
          name: "Entrées",
          texts: { name: { fr: "Entrées" } },
          items: [
            {
              texts: { name: { fr: "Salade" }, description: {} },
              priceCents: 1200,
              badge: "NONE",
            },
          ],
        },
      ],
    } as unknown as PublicMenuSnapshot;

    const result = normalizePublicSnapshot(snapshot);

    expect(result.snapshotVersion).toBe(2);
    expect(result.categories[0].items[0]).toEqual({
      texts: { name: { fr: "Salade" }, description: {} },
      priceCents: 1200,
      badge: "NONE",
      allergens: [],
    });
  });

  it("fills allergens defensively on daily items missing them", () => {
    const snapshot = {
      sourceLocale: "fr",
      availableLocales: ["fr", "en"],
      restaurantName: "R",
      publishedAt: PUBLISHED_AT,
      categories: [],
      dailyItems: [
        {
          id: "d-1",
          texts: { name: { fr: "Plat du jour" }, description: {} },
          priceCents: 1500,
          badge: "NONE",
          validUntilISO: "2026-12-31T23:59:59.000Z",
        },
      ],
    } as unknown as PublicMenuSnapshot;

    const result = normalizePublicSnapshot(snapshot);

    expect(result.dailyItems?.[0].allergens).toEqual([]);
  });

  it("leaves a complete v2 snapshot unchanged at the value level", () => {
    const complete = buildPublicSnapshot(makeMenu(), "R", PUBLISHED_AT);
    expect(normalizePublicSnapshot(complete)).toEqual(complete);
  });

  it("does not introduce a dailyItems key when absent", () => {
    const noDaily = {
      sourceLocale: "fr",
      availableLocales: ["fr"],
      restaurantName: "R",
      publishedAt: PUBLISHED_AT,
      categories: [],
    } as unknown as PublicMenuSnapshot;

    const result = normalizePublicSnapshot(noDaily);
    expect("dailyItems" in result).toBe(false);
  });
});
