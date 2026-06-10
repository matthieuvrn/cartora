import { describe, it, expect } from "vitest";
import { BrandingPolicy, MAX_LOGO_SIZE_BYTES } from "./BrandingPolicy";

describe("BrandingPolicy", () => {
  describe("isAllowedMime / validateMimeType", () => {
    it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s", (mime) => {
      expect(BrandingPolicy.isAllowedMime(mime)).toBe(true);
      expect(BrandingPolicy.validateMimeType(mime)).toBeNull();
    });

    it.each(["image/svg+xml", "image/gif", "application/pdf", "text/html", ""])(
      "rejects %s",
      (mime) => {
        expect(BrandingPolicy.isAllowedMime(mime)).toBe(false);
        expect(BrandingPolicy.validateMimeType(mime)).toEqual({
          field: "mime",
          code: "unsupported_mime",
        });
      },
    );
  });

  describe("validateSize", () => {
    it("accepts a 1 byte file", () => {
      expect(BrandingPolicy.validateSize(1)).toBeNull();
    });

    it("accepts exactly the limit", () => {
      expect(BrandingPolicy.validateSize(MAX_LOGO_SIZE_BYTES)).toBeNull();
    });

    it("rejects 1 byte over the limit", () => {
      expect(BrandingPolicy.validateSize(MAX_LOGO_SIZE_BYTES + 1)).toEqual({
        field: "size",
        code: "validation_failed",
      });
    });

    it("rejects 0 / negative / NaN", () => {
      expect(BrandingPolicy.validateSize(0)).not.toBeNull();
      expect(BrandingPolicy.validateSize(-1)).not.toBeNull();
      expect(BrandingPolicy.validateSize(Number.NaN)).not.toBeNull();
    });
  });

  describe("extensionForMime", () => {
    it("maps each allowed mime to its expected extension", () => {
      expect(BrandingPolicy.extensionForMime("image/jpeg")).toBe("jpg");
      expect(BrandingPolicy.extensionForMime("image/png")).toBe("png");
      expect(BrandingPolicy.extensionForMime("image/webp")).toBe("webp");
    });
  });

  describe("buildLogoStoragePath", () => {
    it("returns <restaurantId>/logo.<ext>", () => {
      expect(BrandingPolicy.buildLogoStoragePath("resto-1", "webp")).toBe("resto-1/logo.webp");
      expect(BrandingPolicy.buildLogoStoragePath("uuid-abc", "png")).toBe("uuid-abc/logo.png");
    });
  });

  describe("normalizeHexColor", () => {
    it.each(["#000000", "#ffffff", "#a1B2c3", "#FF00FF", "  #aabbcc  "])(
      "accepts %s and returns lowercase trimmed",
      (input) => {
        const result = BrandingPolicy.normalizeHexColor(input, "primary");
        expect(result).toMatch(/^#[0-9a-f]{6}$/);
      },
    );

    it("normalizes uppercase to lowercase", () => {
      expect(BrandingPolicy.normalizeHexColor("#ABCDEF", "primary")).toBe("#abcdef");
    });

    it.each(["", "#", "#fff", "#ff00", "#ff00ff0", "abc123", "rgb(0,0,0)", "#zzzzzz"])(
      "rejects %s",
      (input) => {
        expect(() => BrandingPolicy.normalizeHexColor(input, "primary")).toThrowError(
          expect.objectContaining({ name: "DomainError", code: "invalid_brand_color" }),
        );
      },
    );
  });

  describe("contrastRatio", () => {
    it("returns 21 for black/white (extreme case)", () => {
      expect(BrandingPolicy.contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
      expect(BrandingPolicy.contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
    });

    it("returns 1 for identical colors (no contrast)", () => {
      expect(BrandingPolicy.contrastRatio("#abcdef", "#abcdef")).toBeCloseTo(1, 5);
    });

    it("is symmetric", () => {
      const ab = BrandingPolicy.contrastRatio("#ff0000", "#00ff00");
      const ba = BrandingPolicy.contrastRatio("#00ff00", "#ff0000");
      expect(ab).toBeCloseTo(ba, 5);
    });
  });

  describe("meetsContrastAA", () => {
    it("passes for black on white", () => {
      expect(BrandingPolicy.meetsContrastAA("#000000", "#ffffff")).toBe(true);
    });

    it("fails for yellow on white (low contrast)", () => {
      expect(BrandingPolicy.meetsContrastAA("#ffff00", "#ffffff")).toBe(false);
    });

    it("passes amber-400 on stone-950 (warm accent on near-black)", () => {
      // amber-400 ≈ #fbbf24, stone-950 ≈ #0c0a09
      expect(BrandingPolicy.meetsContrastAA("#fbbf24", "#0c0a09")).toBe(true);
    });

    it("fails for medium gray on white (3:1)", () => {
      expect(BrandingPolicy.meetsContrastAA("#999999", "#ffffff")).toBe(false);
    });
  });
});
