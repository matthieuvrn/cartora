import { describe, it, expect } from "vitest";
import {
  ALLERGEN_VALUES,
  ItemPolicy,
  MAX_ITEM_NAME_LENGTH,
  MAX_ITEM_DESCRIPTION_LENGTH,
  MAX_PRICE_CENTS,
} from "./ItemPolicy";

describe("ItemPolicy", () => {
  describe("validateName", () => {
    it("returns null for a valid name", () => {
      expect(ItemPolicy.validateName("Salade César")).toBeNull();
    });

    it("rejects empty string", () => {
      expect(ItemPolicy.validateName("")).not.toBeNull();
    });

    it("rejects whitespace-only string", () => {
      expect(ItemPolicy.validateName("   ")).not.toBeNull();
    });

    it("accepts name at max length", () => {
      expect(ItemPolicy.validateName("a".repeat(MAX_ITEM_NAME_LENGTH))).toBeNull();
    });

    it("rejects name exceeding max length", () => {
      expect(ItemPolicy.validateName("a".repeat(MAX_ITEM_NAME_LENGTH + 1))).not.toBeNull();
    });
  });

  describe("validateDescription", () => {
    it("returns null for a valid description", () => {
      expect(ItemPolicy.validateDescription("Laitue, parmesan, croûtons")).toBeNull();
    });

    it("accepts empty description", () => {
      expect(ItemPolicy.validateDescription("")).toBeNull();
    });

    it("accepts whitespace-only description", () => {
      expect(ItemPolicy.validateDescription("   ")).toBeNull();
    });

    it("accepts description at max length", () => {
      expect(ItemPolicy.validateDescription("a".repeat(MAX_ITEM_DESCRIPTION_LENGTH))).toBeNull();
    });

    it("rejects description exceeding max length", () => {
      expect(
        ItemPolicy.validateDescription("a".repeat(MAX_ITEM_DESCRIPTION_LENGTH + 1)),
      ).not.toBeNull();
    });
  });

  describe("validatePriceCents", () => {
    it("returns null for zero", () => {
      expect(ItemPolicy.validatePriceCents(0)).toBeNull();
    });

    it("returns null for a valid price", () => {
      expect(ItemPolicy.validatePriceCents(1250)).toBeNull();
    });

    it("returns null for max price", () => {
      expect(ItemPolicy.validatePriceCents(MAX_PRICE_CENTS)).toBeNull();
    });

    it("rejects negative price", () => {
      expect(ItemPolicy.validatePriceCents(-1)).not.toBeNull();
    });

    it("rejects price above max", () => {
      expect(ItemPolicy.validatePriceCents(MAX_PRICE_CENTS + 1)).not.toBeNull();
    });

    it("rejects non-integer", () => {
      expect(ItemPolicy.validatePriceCents(12.5)).not.toBeNull();
    });
  });

  describe("validateBadge", () => {
    it.each(["NONE", "NEW", "POPULAR"])("accepts %s", (badge) => {
      expect(ItemPolicy.validateBadge(badge)).toBeNull();
    });

    it("rejects unknown badge", () => {
      expect(ItemPolicy.validateBadge("TRENDING")).not.toBeNull();
    });

    it("rejects lowercase variant", () => {
      expect(ItemPolicy.validateBadge("new")).not.toBeNull();
    });
  });

  describe("sanitizeName", () => {
    it("trims whitespace", () => {
      expect(ItemPolicy.sanitizeName("  Tiramisu  ")).toBe("Tiramisu");
    });

    it("truncates at max length", () => {
      const long = "a".repeat(MAX_ITEM_NAME_LENGTH + 50);
      expect(ItemPolicy.sanitizeName(long)).toHaveLength(MAX_ITEM_NAME_LENGTH);
    });

    it("returns empty string for whitespace-only input", () => {
      expect(ItemPolicy.sanitizeName("   ")).toBe("");
    });
  });

  describe("sanitizeDescription", () => {
    it("trims whitespace", () => {
      expect(ItemPolicy.sanitizeDescription("  Fait maison  ")).toBe("Fait maison");
    });

    it("truncates at max length", () => {
      const long = "a".repeat(MAX_ITEM_DESCRIPTION_LENGTH + 50);
      expect(ItemPolicy.sanitizeDescription(long)).toHaveLength(MAX_ITEM_DESCRIPTION_LENGTH);
    });
  });

  describe("validateAllergens", () => {
    it("accepts an empty list", () => {
      const result = ItemPolicy.validateAllergens([]);
      expect(result.error).toBeNull();
      expect(result.ok).toEqual([]);
    });

    it("accepts every official value", () => {
      const result = ItemPolicy.validateAllergens([...ALLERGEN_VALUES]);
      expect(result.error).toBeNull();
      expect(result.ok).toHaveLength(ALLERGEN_VALUES.length);
    });

    it("dedupes silently", () => {
      const result = ItemPolicy.validateAllergens(["GLUTEN", "GLUTEN", "EGGS"]);
      expect(result.error).toBeNull();
      expect(result.ok.sort()).toEqual(["EGGS", "GLUTEN"]);
    });

    it("rejects unknown values", () => {
      const result = ItemPolicy.validateAllergens(["GLUTEN", "PEPPER"]);
      expect(result.error).toEqual({ field: "allergens", code: "invalid_allergen" });
      expect(result.ok).toEqual([]);
    });

    it("rejects lowercase variants", () => {
      const result = ItemPolicy.validateAllergens(["gluten"]);
      expect(result.error).not.toBeNull();
    });

    it("rejects more values than the official list size", () => {
      const tooMany = Array.from({ length: ALLERGEN_VALUES.length + 1 }, () => "GLUTEN");
      const result = ItemPolicy.validateAllergens(tooMany);
      expect(result.error).toEqual({ field: "allergens", code: "too_many_allergens" });
    });
  });
});
