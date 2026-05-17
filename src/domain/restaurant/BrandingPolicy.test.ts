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
});
