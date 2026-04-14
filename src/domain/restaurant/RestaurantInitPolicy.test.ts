import { describe, it, expect } from "vitest";
import { generateSlug } from "./RestaurantInitPolicy";

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
});
