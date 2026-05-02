import { describe, it, expect } from "vitest";
import {
  RESTAURANT_TYPES,
  defaultCategoryKeysFor,
  generateSlug,
  type RestaurantType,
} from "./RestaurantInitPolicy";

describe("RestaurantInitPolicy", () => {
  describe("generateSlug", () => {
    it("strips hyphens and returns the first 8 characters prefixed with resto-", () => {
      expect(generateSlug("550e8400-e29b-41d4-a716-446655440000")).toBe("resto-550e8400");
    });

    it("returns the first 8 characters when userId has no hyphens", () => {
      expect(generateSlug("abcdefghijklmn")).toBe("resto-abcdefgh");
    });

    it("returns all characters when userId is shorter than 8 chars", () => {
      expect(generateSlug("abc")).toBe("resto-abc");
    });
  });

  describe("defaultCategoryKeysFor", () => {
    it("returns the 4 traditional keys when type is null", () => {
      expect(defaultCategoryKeysFor(null)).toEqual([
        { key: "starters", order: 0 },
        { key: "mains", order: 1 },
        { key: "desserts", order: 2 },
        { key: "drinks", order: 3 },
      ]);
    });

    it("returns the same keys when type is undefined", () => {
      expect(defaultCategoryKeysFor(undefined)).toEqual(defaultCategoryKeysFor(null));
    });

    it("returns 5 pizzeria-specific keys for PIZZERIA", () => {
      expect(defaultCategoryKeysFor("PIZZERIA")).toEqual([
        { key: "pizzas", order: 0 },
        { key: "pasta", order: 1 },
        { key: "antipasti", order: 2 },
        { key: "desserts", order: 3 },
        { key: "drinks", order: 4 },
      ]);
    });

    it("returns bar-specific keys for BAR", () => {
      const result = defaultCategoryKeysFor("BAR");
      expect(result.map((c) => c.key)).toEqual(["cocktails", "beers", "wines", "softs", "boards"]);
    });

    it("returns creperie-specific keys for CREPERIE", () => {
      const result = defaultCategoryKeysFor("CREPERIE");
      expect(result.map((c) => c.key)).toEqual(["crepesSavory", "crepesSweet", "ciders", "drinks"]);
    });

    it("returns a non-empty list with strictly increasing order for every type", () => {
      for (const type of RESTAURANT_TYPES) {
        const result = defaultCategoryKeysFor(type);
        expect(result.length).toBeGreaterThan(0);
        result.forEach((cat, index) => {
          expect(cat.order).toBe(index);
        });
      }
    });

    it("matches TRADITIONAL when explicitly given TRADITIONAL", () => {
      expect(defaultCategoryKeysFor("TRADITIONAL")).toEqual(defaultCategoryKeysFor(null));
    });
  });

  describe("RESTAURANT_TYPES", () => {
    it("contains exactly 8 types in the documented order", () => {
      const expected: RestaurantType[] = [
        "TRADITIONAL",
        "PIZZERIA",
        "BRASSERIE",
        "BAR",
        "CAFE",
        "CREPERIE",
        "FASTFOOD",
        "BAKERY",
      ];
      expect(RESTAURANT_TYPES).toEqual(expected);
    });
  });
});
