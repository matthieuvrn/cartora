import { describe, it, expect } from "vitest";
import { CategoryPolicy, MAX_CATEGORIES, MAX_CATEGORY_NAME_LENGTH } from "./CategoryPolicy";

describe("CategoryPolicy.sanitizeName", () => {
  it("trims surrounding whitespace", () => {
    expect(CategoryPolicy.sanitizeName("  Entrées  ")).toBe("Entrées");
  });

  it("collapses internal whitespace", () => {
    expect(CategoryPolicy.sanitizeName("Plats   du   jour")).toBe("Plats du jour");
  });

  it("truncates beyond max length", () => {
    const long = "a".repeat(MAX_CATEGORY_NAME_LENGTH + 5);
    expect(CategoryPolicy.sanitizeName(long)).toHaveLength(MAX_CATEGORY_NAME_LENGTH);
  });
});

describe("CategoryPolicy.validateName", () => {
  it("returns null for a valid name", () => {
    expect(CategoryPolicy.validateName("Tapas")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(CategoryPolicy.validateName("")).not.toBeNull();
  });

  it("accepts at max length", () => {
    expect(CategoryPolicy.validateName("a".repeat(MAX_CATEGORY_NAME_LENGTH))).toBeNull();
  });

  it("rejects beyond max length", () => {
    expect(CategoryPolicy.validateName("a".repeat(MAX_CATEGORY_NAME_LENGTH + 1))).not.toBeNull();
  });

  it("rejects control characters", () => {
    expect(CategoryPolicy.validateName("Tapas\x00")).not.toBeNull();
    expect(CategoryPolicy.validateName("Tapas\x1F")).not.toBeNull();
    expect(CategoryPolicy.validateName("Tapas\x7F")).not.toBeNull();
  });
});

describe("CategoryPolicy.canAddCategory", () => {
  describe("FREE tier (cap 6)", () => {
    it("allows below 6", () => {
      expect(CategoryPolicy.canAddCategory(0, "FREE")).toBe(true);
      expect(CategoryPolicy.canAddCategory(5, "FREE")).toBe(true);
    });

    it("refuses at or above 6", () => {
      expect(CategoryPolicy.canAddCategory(6, "FREE")).toBe(false);
      expect(CategoryPolicy.canAddCategory(10, "FREE")).toBe(false);
    });
  });

  describe("STARTER tier (cap 10)", () => {
    it("allows below 10", () => {
      expect(CategoryPolicy.canAddCategory(0, "STARTER")).toBe(true);
      expect(CategoryPolicy.canAddCategory(9, "STARTER")).toBe(true);
    });

    it("refuses at or above 10", () => {
      expect(CategoryPolicy.canAddCategory(10, "STARTER")).toBe(false);
    });
  });

  describe("PRO tier (cap = MAX_CATEGORIES safety bound)", () => {
    it("allows up to the safety cap", () => {
      expect(CategoryPolicy.canAddCategory(0, "PRO")).toBe(true);
      expect(CategoryPolicy.canAddCategory(MAX_CATEGORIES - 1, "PRO")).toBe(true);
    });

    it("refuses at and above the safety cap", () => {
      expect(CategoryPolicy.canAddCategory(MAX_CATEGORIES, "PRO")).toBe(false);
      expect(CategoryPolicy.canAddCategory(MAX_CATEGORIES + 5, "PRO")).toBe(false);
    });
  });
});

describe("CategoryPolicy.maxFor", () => {
  it("FREE = 6", () => {
    expect(CategoryPolicy.maxFor("FREE")).toBe(6);
  });
  it("STARTER = 10", () => {
    expect(CategoryPolicy.maxFor("STARTER")).toBe(10);
  });
  it("PRO = MAX_CATEGORIES safety cap", () => {
    expect(CategoryPolicy.maxFor("PRO")).toBe(MAX_CATEGORIES);
  });
});

describe("CategoryPolicy.isDuplicateName", () => {
  const existing = [
    { id: "a", name: "Entrées" },
    { id: "b", name: "Plats" },
  ];

  it("detects exact match", () => {
    expect(CategoryPolicy.isDuplicateName(existing, "Entrées")).toBe(true);
  });

  it("detects case-insensitive match", () => {
    expect(CategoryPolicy.isDuplicateName(existing, "ENTRÉES")).toBe(true);
    expect(CategoryPolicy.isDuplicateName(existing, "entrées")).toBe(true);
  });

  it("detects whitespace-trimmed match", () => {
    expect(CategoryPolicy.isDuplicateName(existing, "  entrées  ")).toBe(true);
  });

  it("returns false for new name", () => {
    expect(CategoryPolicy.isDuplicateName(existing, "Tapas")).toBe(false);
  });

  it("excludes the named id (rename to same value)", () => {
    expect(CategoryPolicy.isDuplicateName(existing, "Entrées", "a")).toBe(false);
  });
});
