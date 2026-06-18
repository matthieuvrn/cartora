import { describe, it, expect } from "vitest";
import {
  SUPPORTED_MENU_LOCALES,
  MENU_LOCALE_LABELS,
  isMenuLocale,
  resolveText,
  type LocalizedText,
} from "./MenuLocale";

describe("SUPPORTED_MENU_LOCALES", () => {
  it("contains the v1 set (fr source + 4 cibles latines)", () => {
    expect(SUPPORTED_MENU_LOCALES).toEqual(["fr", "en", "es", "de", "it"]);
  });

  it("has an endonym label for every locale", () => {
    // Record<MenuLocale, string> garantit l'exhaustivité à la compilation ;
    // ce test garde-fou vérifie qu'aucun label n'est vide.
    for (const locale of SUPPORTED_MENU_LOCALES) {
      expect(MENU_LOCALE_LABELS[locale].length).toBeGreaterThan(0);
    }
  });
});

describe("isMenuLocale", () => {
  it("accepts every supported locale", () => {
    for (const locale of SUPPORTED_MENU_LOCALES) {
      expect(isMenuLocale(locale)).toBe(true);
    }
  });

  it("rejects unknown, uppercase and region-tagged codes", () => {
    expect(isMenuLocale("pt")).toBe(false);
    expect(isMenuLocale("FR")).toBe(false);
    expect(isMenuLocale("en-GB")).toBe(false);
    expect(isMenuLocale("")).toBe(false);
  });
});

describe("resolveText", () => {
  const map: LocalizedText = { fr: "Salade niçoise", en: "Niçoise salad" };

  it("returns the requested locale when present", () => {
    expect(resolveText(map, "en", "fr")).toBe("Niçoise salad");
  });

  it("returns the source text when requested locale is absent", () => {
    expect(resolveText(map, "es", "fr")).toBe("Salade niçoise");
  });

  it("treats an empty string as missing (falls back to source)", () => {
    expect(resolveText({ fr: "Salade", de: "" }, "de", "fr")).toBe("Salade");
  });

  it("returns the source text when requested === source", () => {
    expect(resolveText(map, "fr", "fr")).toBe("Salade niçoise");
  });

  it("returns empty string when even the source is missing", () => {
    expect(resolveText({}, "it", "fr")).toBe("");
    expect(resolveText({ fr: "" }, "it", "fr")).toBe("");
  });
});
