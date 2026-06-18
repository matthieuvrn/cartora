import { describe, it, expect } from "vitest";
import { hashSourceText } from "./textHash";

describe("hashSourceText", () => {
  it("is deterministic", () => {
    expect(hashSourceText("Salade niçoise")).toBe(hashSourceText("Salade niçoise"));
  });

  it("returns an 8-char lowercase hex string", () => {
    expect(hashSourceText("Tartare de bœuf")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("trims before hashing (whitespace-only edits are not source changes)", () => {
    expect(hashSourceText("  Salade  ")).toBe(hashSourceText("Salade"));
  });

  it("differs for different texts", () => {
    expect(hashSourceText("Salade niçoise")).not.toBe(hashSourceText("Salade césar"));
  });

  it("is sensitive to diacritics and unicode beyond ASCII", () => {
    expect(hashSourceText("Crème brûlée")).not.toBe(hashSourceText("Creme brulee"));
    expect(hashSourceText("🍕 Pizza")).not.toBe(hashSourceText("Pizza"));
  });

  it("hashes the empty string to the FNV-1a offset basis", () => {
    // 0x811c9dc5 — valeur de référence publique de FNV-1a 32 bits.
    expect(hashSourceText("")).toBe("811c9dc5");
    expect(hashSourceText("   ")).toBe("811c9dc5");
  });
});
