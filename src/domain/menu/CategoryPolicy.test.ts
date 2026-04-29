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
  it("allows below the cap", () => {
    expect(CategoryPolicy.canAddCategory(0)).toBe(true);
    expect(CategoryPolicy.canAddCategory(MAX_CATEGORIES - 1)).toBe(true);
  });

  it("refuses at and above the cap", () => {
    expect(CategoryPolicy.canAddCategory(MAX_CATEGORIES)).toBe(false);
    expect(CategoryPolicy.canAddCategory(MAX_CATEGORIES + 5)).toBe(false);
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
