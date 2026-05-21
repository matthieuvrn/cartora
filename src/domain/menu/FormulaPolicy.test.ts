import { describe, it, expect } from "vitest";
import { FormulaPolicy } from "./FormulaPolicy";

describe("FormulaPolicy", () => {
  describe("validateName", () => {
    it("rejects empty / whitespace-only", () => {
      expect(FormulaPolicy.validateName("")).toEqual({ field: "name", code: "name_required" });
      expect(FormulaPolicy.validateName("   ")).toEqual({ field: "name", code: "name_required" });
    });

    it("rejects > 100 chars", () => {
      expect(FormulaPolicy.validateName("x".repeat(101))).toEqual({
        field: "name",
        code: "name_too_long",
      });
    });

    it("accepts a typical name", () => {
      expect(FormulaPolicy.validateName("Menu du midi")).toBeNull();
    });
  });

  describe("validatePriceCents", () => {
    it("rejects non-integers", () => {
      expect(FormulaPolicy.validatePriceCents(12.5)).toEqual({
        field: "priceCents",
        code: "price_not_integer",
      });
    });

    it("rejects negative", () => {
      expect(FormulaPolicy.validatePriceCents(-1)).toEqual({
        field: "priceCents",
        code: "price_too_low",
      });
    });

    it("rejects > 99999 (999.99 €)", () => {
      expect(FormulaPolicy.validatePriceCents(100000)).toEqual({
        field: "priceCents",
        code: "price_too_high",
      });
    });

    it("accepts 0 and max", () => {
      expect(FormulaPolicy.validatePriceCents(0)).toBeNull();
      expect(FormulaPolicy.validatePriceCents(99999)).toBeNull();
    });
  });

  describe("validateValidUntil", () => {
    const now = "2026-05-17T12:00:00.000Z";

    it("rejects past date", () => {
      expect(FormulaPolicy.validateValidUntil("2026-05-17T11:00:00.000Z", now)).toEqual({
        field: "validUntil",
        code: "formula_until_in_past",
      });
    });

    it("rejects same instant (strict future)", () => {
      expect(FormulaPolicy.validateValidUntil(now, now)).toEqual({
        field: "validUntil",
        code: "formula_until_in_past",
      });
    });

    it("rejects > 14 days ahead", () => {
      expect(FormulaPolicy.validateValidUntil("2026-06-15T00:00:00.000Z", now)).toEqual({
        field: "validUntil",
        code: "formula_until_too_far",
      });
    });

    it("accepts a few hours ahead", () => {
      expect(FormulaPolicy.validateValidUntil("2026-05-17T23:59:00.000Z", now)).toBeNull();
    });

    it("rejects invalid ISO string", () => {
      expect(FormulaPolicy.validateValidUntil("not-a-date", now)).toEqual({
        field: "validUntil",
        code: "validation_failed",
      });
    });
  });

  describe("defaultExpirationISO", () => {
    it("returns end of day in Europe/Paris (winter, CET = UTC+1)", () => {
      const iso = FormulaPolicy.defaultExpirationISO("2026-01-15T12:00:00.000Z");
      expect(iso).toBe("2026-01-15T22:59:59.999Z");
    });

    it("returns end of day in Europe/Paris (summer, CEST = UTC+2)", () => {
      const iso = FormulaPolicy.defaultExpirationISO("2026-07-15T12:00:00.000Z");
      expect(iso).toBe("2026-07-15T21:59:59.999Z");
    });

    it("uses Paris-local calendar day for `now` near UTC midnight", () => {
      const iso = FormulaPolicy.defaultExpirationISO("2026-01-15T23:30:00.000Z");
      expect(iso).toBe("2026-01-16T22:59:59.999Z");
    });
  });

  describe("isActive", () => {
    const now = "2026-05-17T12:00:00.000Z";

    it("true when validUntil > now", () => {
      expect(FormulaPolicy.isActive({ validUntilISO: "2026-05-17T23:00:00.000Z" }, now)).toBe(true);
    });

    it("false when validUntil < now", () => {
      expect(FormulaPolicy.isActive({ validUntilISO: "2026-05-17T11:00:00.000Z" }, now)).toBe(
        false,
      );
    });

    it("false when validUntil == now (strict)", () => {
      expect(FormulaPolicy.isActive({ validUntilISO: now }, now)).toBe(false);
    });
  });

  describe("sanitize", () => {
    it("trims and caps name at 100", () => {
      expect(FormulaPolicy.sanitizeName("  hello   ")).toBe("hello");
      expect(FormulaPolicy.sanitizeName("x".repeat(150))).toHaveLength(100);
    });

    it("trims and caps description at 500", () => {
      expect(FormulaPolicy.sanitizeDescription("  hi  ")).toBe("hi");
      expect(FormulaPolicy.sanitizeDescription("y".repeat(600))).toHaveLength(500);
    });
  });
});
