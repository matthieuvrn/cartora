import { describe, it, expect } from "vitest";
import { matchesQuery, normalizeForSearch } from "./text-search";

describe("normalizeForSearch", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalizeForSearch("Crème Brûlée")).toBe("creme brulee");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeForSearch("  Café  ")).toBe("cafe");
  });

  it("keeps non-diacritic characters intact", () => {
    expect(normalizeForSearch("Œufs mimosa n°2")).toBe("œufs mimosa n°2");
  });
});

describe("matchesQuery", () => {
  it("matches case- and accent-insensitively in both directions", () => {
    expect(matchesQuery("Crème brûlée", "creme")).toBe(true);
    expect(matchesQuery("creme brulee", "Crème")).toBe(true);
    expect(matchesQuery("Salade César", "CÉSAR")).toBe(true);
  });

  it("matches partial substrings", () => {
    expect(matchesQuery("Spaghetti Carbonara", "carbo")).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(matchesQuery("Tartare de bœuf", "pizza")).toBe(false);
  });

  it("empty or whitespace-only query matches everything", () => {
    expect(matchesQuery("Anything", "")).toBe(true);
    expect(matchesQuery("Anything", "   ")).toBe(true);
  });
});
