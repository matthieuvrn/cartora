import { describe, it, expect } from "vitest";
import { RestaurantPolicy, MAX_DISPLAY_NAME_LENGTH } from "./RestaurantPolicy";

describe("RestaurantPolicy", () => {
  describe("validateDisplayName", () => {
    it("returns null for a valid name", () => {
      expect(RestaurantPolicy.validateDisplayName("Chez Marcel")).toBeNull();
    });

    it("rejects empty string", () => {
      expect(RestaurantPolicy.validateDisplayName("")).not.toBeNull();
    });

    it("rejects whitespace-only string", () => {
      expect(RestaurantPolicy.validateDisplayName("   ")).not.toBeNull();
    });

    it("accepts name at max length", () => {
      expect(RestaurantPolicy.validateDisplayName("a".repeat(MAX_DISPLAY_NAME_LENGTH))).toBeNull();
    });

    it("rejects name exceeding max length", () => {
      expect(
        RestaurantPolicy.validateDisplayName("a".repeat(MAX_DISPLAY_NAME_LENGTH + 1)),
      ).not.toBeNull();
    });
  });

  describe("sanitizeDisplayName", () => {
    it("trims whitespace", () => {
      expect(RestaurantPolicy.sanitizeDisplayName("  Chez Marcel  ")).toBe("Chez Marcel");
    });

    it("truncates at max length", () => {
      const long = "a".repeat(MAX_DISPLAY_NAME_LENGTH + 50);
      expect(RestaurantPolicy.sanitizeDisplayName(long)).toHaveLength(MAX_DISPLAY_NAME_LENGTH);
    });

    it("returns empty string for whitespace-only input", () => {
      expect(RestaurantPolicy.sanitizeDisplayName("   ")).toBe("");
    });
  });
});
