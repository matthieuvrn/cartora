import { describe, it, expect } from "vitest";
import {
  getLocalizedText,
  formatPrice,
  formatPriceAria,
  collectPresentAllergens,
  resolveLcpPriority,
} from "./publicMenuView";
import type { PublicMenuSnapshot, PublicMenuItem, PublicMenuDailyDish } from "./PublicMenuTypes";

function makeItem(overrides: Partial<PublicMenuItem> = {}): PublicMenuItem {
  return {
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
    ...overrides,
  };
}

function makeDaily(overrides: Partial<PublicMenuDailyDish> = {}): PublicMenuDailyDish {
  return {
    id: "daily-1",
    nameFr: "Plat du jour",
    nameEn: "Dish of the day",
    descriptionFr: "",
    descriptionEn: "",
    priceCents: 1500,
    badge: "NONE",
    allergens: [],
    imagePath: null,
    altTextFr: "",
    altTextEn: "",
    validUntilISO: "2026-03-25T22:00:00.000Z",
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<PublicMenuSnapshot> = {}): PublicMenuSnapshot {
  return {
    restaurantName: "Mon Restaurant",
    categories: [{ name: "Entrées", items: [makeItem()] }],
    publishedAt: "2026-03-25T12:00:00.000Z",
    ...overrides,
  };
}

describe("getLocalizedText", () => {
  it("returns FR text for fr locale", () => {
    expect(getLocalizedText("Bonjour", "Hello", "fr")).toBe("Bonjour");
  });

  it("returns EN text for en locale", () => {
    expect(getLocalizedText("Bonjour", "Hello", "en")).toBe("Hello");
  });

  it("falls back to FR when EN is empty", () => {
    expect(getLocalizedText("Bonjour", "", "en")).toBe("Bonjour");
  });
});

describe("formatPrice", () => {
  // Intl fr-FR inserts a narrow no-break space (U+202F) before €; normalise whitespace
  // so the assertion is stable across ICU versions.
  const norm = (s: string) => s.replace(/\s/g, " ");

  it("formats fr-FR with comma + trailing euro sign", () => {
    expect(norm(formatPrice(1250, "fr"))).toBe("12,50 €");
  });

  it("formats en-US with leading euro sign + dot", () => {
    expect(formatPrice(1250, "en")).toBe("€12.50");
  });
});

describe("formatPriceAria", () => {
  it("spells whole euros in fr", () => {
    expect(formatPriceAria(1200, "fr")).toBe("12 euros");
  });

  it("spells euros + cents in fr", () => {
    expect(formatPriceAria(1250, "fr")).toBe("12 euros 50");
  });

  it("appends 'cents' in en", () => {
    expect(formatPriceAria(1250, "en")).toBe("12 euros 50 cents");
  });
});

describe("collectPresentAllergens", () => {
  it("unions allergens from items and daily dishes", () => {
    const snapshot = makeSnapshot({
      categories: [
        {
          name: "Plats",
          items: [makeItem({ allergens: ["GLUTEN", "EGGS"] }), makeItem({ allergens: ["EGGS"] })],
        },
      ],
      dailyItems: [makeDaily({ allergens: ["MILK"] })],
    });

    expect(collectPresentAllergens(snapshot)).toEqual(new Set(["MILK", "GLUTEN", "EGGS"]));
  });

  it("returns an empty set when nothing carries allergens", () => {
    expect(collectPresentAllergens(makeSnapshot()).size).toBe(0);
  });
});

describe("resolveLcpPriority", () => {
  it("gives priority to the first daily dish with a photo over category items", () => {
    const snapshot = makeSnapshot({
      categories: [{ name: "Plats", items: [makeItem({ imagePath: "cat/p.jpg" })] }],
      dailyItems: [
        makeDaily({ imagePath: null }),
        makeDaily({ id: "daily-2", imagePath: "d/p.jpg" }),
      ],
    });

    const result = resolveLcpPriority(snapshot);
    expect(result.dailyHasPhoto).toBe(true);
    expect(result.firstDailyPhotoIndex).toBe(1);
    // Daily wins → category locator stays null even though an item has a photo.
    expect(result.firstPhotoLocator).toBeNull();
  });

  it("falls back to the first category item with a photo when no daily has one", () => {
    const snapshot = makeSnapshot({
      categories: [
        { name: "Entrées", items: [makeItem({ imagePath: null })] },
        { name: "Plats", items: [makeItem({ imagePath: null }), makeItem({ imagePath: "p.jpg" })] },
      ],
      dailyItems: [makeDaily({ imagePath: null })],
    });

    const result = resolveLcpPriority(snapshot);
    expect(result.dailyHasPhoto).toBe(false);
    expect(result.firstDailyPhotoIndex).toBe(-1);
    expect(result.firstPhotoLocator).toEqual({ categoryName: "Plats", itemIndex: 1 });
  });

  it("returns a null locator when there is no photo at all", () => {
    const result = resolveLcpPriority(makeSnapshot());
    expect(result).toEqual({
      dailyHasPhoto: false,
      firstDailyPhotoIndex: -1,
      firstPhotoLocator: null,
    });
  });
});
