import { describe, it, expect } from "vitest";
import { ItemPhotoPolicy, MAX_IMAGE_SIZE_BYTES, MAX_ALT_TEXT_LENGTH } from "./ItemPhotoPolicy";

describe("ItemPhotoPolicy", () => {
  describe("validateMimeType", () => {
    it("accepts jpeg, png, webp", () => {
      expect(ItemPhotoPolicy.validateMimeType("image/jpeg")).toBeNull();
      expect(ItemPhotoPolicy.validateMimeType("image/png")).toBeNull();
      expect(ItemPhotoPolicy.validateMimeType("image/webp")).toBeNull();
    });

    it("rejects gif, svg, pdf, anything else", () => {
      expect(ItemPhotoPolicy.validateMimeType("image/gif")).not.toBeNull();
      expect(ItemPhotoPolicy.validateMimeType("image/svg+xml")).not.toBeNull();
      expect(ItemPhotoPolicy.validateMimeType("application/pdf")).not.toBeNull();
      expect(ItemPhotoPolicy.validateMimeType("")).not.toBeNull();
    });
  });

  describe("validateSize", () => {
    it("accepts sizes up to the cap", () => {
      expect(ItemPhotoPolicy.validateSize(1)).toBeNull();
      expect(ItemPhotoPolicy.validateSize(MAX_IMAGE_SIZE_BYTES)).toBeNull();
    });

    it("rejects files above the cap", () => {
      expect(ItemPhotoPolicy.validateSize(MAX_IMAGE_SIZE_BYTES + 1)).not.toBeNull();
    });

    it("rejects empty or invalid sizes", () => {
      expect(ItemPhotoPolicy.validateSize(0)).not.toBeNull();
      expect(ItemPhotoPolicy.validateSize(-1)).not.toBeNull();
      expect(ItemPhotoPolicy.validateSize(Number.NaN)).not.toBeNull();
    });
  });

  describe("validateAltText", () => {
    it("trims and returns the value", () => {
      expect(ItemPhotoPolicy.validateAltText("  Salade  ")).toEqual({
        ok: "Salade",
        error: null,
      });
    });

    it("truncates and reports an error past the cap", () => {
      const longText = "x".repeat(MAX_ALT_TEXT_LENGTH + 10);
      const result = ItemPhotoPolicy.validateAltText(longText);
      expect(result.ok.length).toBe(MAX_ALT_TEXT_LENGTH);
      expect(result.error).not.toBeNull();
    });

    it("accepts empty string", () => {
      expect(ItemPhotoPolicy.validateAltText("")).toEqual({ ok: "", error: null });
    });
  });

  describe("extensionForMime", () => {
    it("maps mime to extension", () => {
      expect(ItemPhotoPolicy.extensionForMime("image/jpeg")).toBe("jpg");
      expect(ItemPhotoPolicy.extensionForMime("image/png")).toBe("png");
      expect(ItemPhotoPolicy.extensionForMime("image/webp")).toBe("webp");
    });
  });

  describe("buildStoragePath", () => {
    it("produces <restaurantId>/<itemId>.<ext>", () => {
      expect(ItemPhotoPolicy.buildStoragePath("resto-1", "item-2", "webp")).toBe(
        "resto-1/item-2.webp",
      );
    });
  });
});
