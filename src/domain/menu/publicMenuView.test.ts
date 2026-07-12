import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatPriceAria,
  collectPresentAllergens,
  categoryAnchorId,
} from "./publicMenuView";
import type { PublicMenuSnapshot, PublicMenuItem, PublicMenuDailyDish } from "./PublicMenuTypes";

function makeItem(overrides: Partial<PublicMenuItem> = {}): PublicMenuItem {
  return {
    nameFr: "Salade",
    nameEn: "Salad",
    descriptionFr: "Fraîche",
    descriptionEn: "Fresh",
    texts: {
      name: { fr: "Salade", en: "Salad" },
      description: { fr: "Fraîche", en: "Fresh" },
    },
    priceCents: 1200,
    badge: "NONE",
    allergens: [],
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
    texts: {
      name: { fr: "Plat du jour", en: "Dish of the day" },
      description: {},
    },
    priceCents: 1500,
    badge: "NONE",
    allergens: [],
    validUntilISO: "2026-03-25T22:00:00.000Z",
    ...overrides,
  };
}

function makeCategory(name: string, items: PublicMenuItem[]) {
  return { name, texts: { name: { fr: name } }, items };
}

function makeSnapshot(overrides: Partial<PublicMenuSnapshot> = {}): PublicMenuSnapshot {
  return {
    snapshotVersion: 2,
    sourceLocale: "fr",
    availableLocales: ["fr", "en"],
    restaurantName: "Mon Restaurant",
    categories: [makeCategory("Entrées", [makeItem()])],
    publishedAt: "2026-03-25T12:00:00.000Z",
    ...overrides,
  };
}

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

  it("formats es/de/it with comma + trailing euro sign (S4)", () => {
    expect(norm(formatPrice(1250, "es"))).toBe("12,50 €");
    expect(norm(formatPrice(1250, "de"))).toBe("12,50 €");
    expect(norm(formatPrice(1250, "it"))).toBe("12,50 €");
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

  it("spells locale-specific currency words in es/de/it (S4)", () => {
    expect(formatPriceAria(1250, "es")).toBe("12 euros 50 céntimos");
    expect(formatPriceAria(1250, "de")).toBe("12 Euro 50 Cent");
    expect(formatPriceAria(1250, "it")).toBe("12 euro 50 centesimi");
    expect(formatPriceAria(1200, "de")).toBe("12 Euro");
  });
});

describe("collectPresentAllergens", () => {
  it("unions allergens from items and daily dishes", () => {
    const snapshot = makeSnapshot({
      categories: [
        makeCategory("Plats", [
          makeItem({ allergens: ["GLUTEN", "EGGS"] }),
          makeItem({ allergens: ["EGGS"] }),
        ]),
      ],
      dailyItems: [makeDaily({ allergens: ["MILK"] })],
    });

    expect(collectPresentAllergens(snapshot)).toEqual(new Set(["MILK", "GLUTEN", "EGGS"]));
  });

  it("returns an empty set when nothing carries allergens", () => {
    expect(collectPresentAllergens(makeSnapshot()).size).toBe(0);
  });
});

describe("categoryAnchorId", () => {
  it("strips diacritics, lowercases and prefixes", () => {
    expect(categoryAnchorId("Entrées")).toBe("cat-entrees");
  });

  it("collapses spaces and special characters into single hyphens", () => {
    expect(categoryAnchorId("Plats & Garnitures")).toBe("cat-plats-garnitures");
  });

  it("trims leading/trailing separators", () => {
    expect(categoryAnchorId("  Desserts !  ")).toBe("cat-desserts");
  });

  it("is deterministic (same name → same id)", () => {
    expect(categoryAnchorId("Boissons")).toBe(categoryAnchorId("Boissons"));
  });

  it("falls back to cat-section when no latin character remains", () => {
    expect(categoryAnchorId("🍕")).toBe("cat-section");
  });
});
