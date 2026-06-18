import { describe, it, expect } from "vitest";
import { MenuLocalePolicy } from "./MenuLocalePolicy";

describe("MenuLocalePolicy", () => {
  describe("validateLocaleCode", () => {
    it("accepts supported codes", () => {
      expect(MenuLocalePolicy.validateLocaleCode("en")).toBeNull();
      expect(MenuLocalePolicy.validateLocaleCode("it")).toBeNull();
    });

    it("rejects unknown or malformed codes", () => {
      expect(MenuLocalePolicy.validateLocaleCode("pt")).toEqual({
        field: "locale",
        code: "invalid_locale",
      });
      expect(MenuLocalePolicy.validateLocaleCode("EN")).toEqual({
        field: "locale",
        code: "invalid_locale",
      });
      expect(MenuLocalePolicy.validateLocaleCode("")).toEqual({
        field: "locale",
        code: "invalid_locale",
      });
    });
  });

  describe("normalizeEnabledLocales", () => {
    it("trims, lowercases and dedupes while preserving order", () => {
      expect(MenuLocalePolicy.normalizeEnabledLocales("fr", [" EN ", "es", "en", "ES"])).toEqual([
        "en",
        "es",
      ]);
    });

    it("strips the source locale (always available, never a target)", () => {
      expect(MenuLocalePolicy.normalizeEnabledLocales("fr", ["fr", "en"])).toEqual(["en"]);
    });

    it("drops empty entries but keeps unknown codes for validation to flag", () => {
      // Les codes inconnus ne sont PAS filtrés silencieusement — validateEnabledLocales
      // doit pouvoir produire invalid_locale au lieu d'avaler l'erreur.
      expect(MenuLocalePolicy.normalizeEnabledLocales("fr", ["", "xx", "en"])).toEqual([
        "xx",
        "en",
      ]);
    });

    it("returns empty list for empty input", () => {
      expect(MenuLocalePolicy.normalizeEnabledLocales("fr", [])).toEqual([]);
    });
  });

  describe("validateEnabledLocales", () => {
    it("accepts a list within quota", () => {
      expect(
        MenuLocalePolicy.validateEnabledLocales({
          sourceLocale: "fr",
          normalized: ["en"],
          maxExtra: 1,
        }),
      ).toBeNull();
    });

    it("accepts any list size with Infinity quota (PRO)", () => {
      expect(
        MenuLocalePolicy.validateEnabledLocales({
          sourceLocale: "fr",
          normalized: ["en", "es", "de", "it"],
          maxExtra: Infinity,
        }),
      ).toBeNull();
    });

    it("flags the first unknown code as invalid_locale", () => {
      expect(
        MenuLocalePolicy.validateEnabledLocales({
          sourceLocale: "fr",
          normalized: ["en", "xx"],
          maxExtra: Infinity,
        }),
      ).toEqual({ field: "locale", code: "invalid_locale" });
    });

    it("flags quota overflow as locale_quota_exceeded", () => {
      expect(
        MenuLocalePolicy.validateEnabledLocales({
          sourceLocale: "fr",
          normalized: ["en", "es"],
          maxExtra: 1,
        }),
      ).toEqual({ field: "locales", code: "locale_quota_exceeded" });
    });

    it("rejects any extra locale when quota is 0 (FREE)", () => {
      expect(
        MenuLocalePolicy.validateEnabledLocales({
          sourceLocale: "fr",
          normalized: ["en"],
          maxExtra: 0,
        }),
      ).toEqual({ field: "locales", code: "locale_quota_exceeded" });
    });

    it("checks invalid codes before quota (clearer error for the user)", () => {
      expect(
        MenuLocalePolicy.validateEnabledLocales({
          sourceLocale: "fr",
          normalized: ["xx", "en"],
          maxExtra: 1,
        }),
      ).toEqual({ field: "locale", code: "invalid_locale" });
    });
  });
});
