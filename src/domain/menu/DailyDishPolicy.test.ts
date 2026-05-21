import { describe, it, expect } from "vitest";
import { DailyDishPolicy } from "./DailyDishPolicy";

describe("DailyDishPolicy", () => {
  describe("validateName", () => {
    it("rejects empty / whitespace-only", () => {
      expect(DailyDishPolicy.validateName("")).toEqual({ field: "name", code: "name_required" });
      expect(DailyDishPolicy.validateName("   ")).toEqual({ field: "name", code: "name_required" });
    });

    it("rejects > 100 chars", () => {
      expect(DailyDishPolicy.validateName("x".repeat(101))).toEqual({
        field: "name",
        code: "name_too_long",
      });
    });

    it("accepts a typical name", () => {
      expect(DailyDishPolicy.validateName("Pot-au-feu maison")).toBeNull();
    });
  });

  describe("validatePriceCents", () => {
    it("rejects non-integers", () => {
      expect(DailyDishPolicy.validatePriceCents(12.5)).toEqual({
        field: "priceCents",
        code: "price_not_integer",
      });
    });

    it("rejects negative", () => {
      expect(DailyDishPolicy.validatePriceCents(-1)).toEqual({
        field: "priceCents",
        code: "price_too_low",
      });
    });

    it("rejects > 99999 (999.99 €)", () => {
      expect(DailyDishPolicy.validatePriceCents(100000)).toEqual({
        field: "priceCents",
        code: "price_too_high",
      });
    });

    it("accepts 0 and max", () => {
      expect(DailyDishPolicy.validatePriceCents(0)).toBeNull();
      expect(DailyDishPolicy.validatePriceCents(99999)).toBeNull();
    });
  });

  describe("validateValidUntil", () => {
    const now = "2026-05-17T12:00:00.000Z";

    it("rejects past date", () => {
      expect(DailyDishPolicy.validateValidUntil("2026-05-17T11:00:00.000Z", now)).toEqual({
        field: "validUntil",
        code: "daily_dish_until_in_past",
      });
    });

    it("rejects same instant (must be strictly future)", () => {
      expect(DailyDishPolicy.validateValidUntil(now, now)).toEqual({
        field: "validUntil",
        code: "daily_dish_until_in_past",
      });
    });

    it("rejects > 14 days ahead", () => {
      expect(DailyDishPolicy.validateValidUntil("2026-06-15T00:00:00.000Z", now)).toEqual({
        field: "validUntil",
        code: "daily_dish_until_too_far",
      });
    });

    it("accepts a few hours ahead", () => {
      expect(DailyDishPolicy.validateValidUntil("2026-05-17T23:59:00.000Z", now)).toBeNull();
    });

    it("rejects invalid ISO string", () => {
      expect(DailyDishPolicy.validateValidUntil("not-a-date", now)).toEqual({
        field: "validUntil",
        code: "validation_failed",
      });
    });
  });

  describe("defaultExpirationISO", () => {
    it("returns the end of the current day in Europe/Paris (winter, CET = UTC+1)", () => {
      // 12:00 UTC = 13:00 Paris (CET). Fin de journée = 23:59:59.999 Paris = 22:59:59.999 UTC.
      const iso = DailyDishPolicy.defaultExpirationISO("2026-01-15T12:00:00.000Z");
      expect(iso).toBe("2026-01-15T22:59:59.999Z");
    });

    it("returns the end of the current day in Europe/Paris (summer, CEST = UTC+2)", () => {
      // 12:00 UTC = 14:00 Paris (CEST). Fin de journée = 23:59:59.999 Paris = 21:59:59.999 UTC.
      const iso = DailyDishPolicy.defaultExpirationISO("2026-07-15T12:00:00.000Z");
      expect(iso).toBe("2026-07-15T21:59:59.999Z");
    });

    it("uses the Paris-local calendar day for `now` near UTC midnight", () => {
      // 23:30 UTC en hiver = 00:30 Paris du jour suivant.
      // Fin de journée Paris = 23:59:59.999 du jour Paris = 22:59:59.999 UTC.
      const iso = DailyDishPolicy.defaultExpirationISO("2026-01-15T23:30:00.000Z");
      expect(iso).toBe("2026-01-16T22:59:59.999Z");
    });
  });

  describe("isActive", () => {
    const now = "2026-05-17T12:00:00.000Z";

    it("true when validUntil > now", () => {
      expect(DailyDishPolicy.isActive({ validUntilISO: "2026-05-17T23:00:00.000Z" }, now)).toBe(
        true,
      );
    });

    it("false when validUntil < now", () => {
      expect(DailyDishPolicy.isActive({ validUntilISO: "2026-05-17T11:00:00.000Z" }, now)).toBe(
        false,
      );
    });

    it("false when validUntil == now (strict comparison)", () => {
      expect(DailyDishPolicy.isActive({ validUntilISO: now }, now)).toBe(false);
    });
  });

  describe("sanitize", () => {
    it("trims and caps name at 100", () => {
      expect(DailyDishPolicy.sanitizeName("  hello   ")).toBe("hello");
      expect(DailyDishPolicy.sanitizeName("x".repeat(150))).toHaveLength(100);
    });

    it("trims and caps description at 500", () => {
      expect(DailyDishPolicy.sanitizeDescription("  hi  ")).toBe("hi");
      expect(DailyDishPolicy.sanitizeDescription("y".repeat(600))).toHaveLength(500);
    });
  });
});
