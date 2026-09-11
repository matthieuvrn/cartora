import { describe, it, expect } from "vitest";
import { expiresToday } from "./expiryStatus";
import { DailyDishPolicy } from "./DailyDishPolicy";
import { FormulaPolicy } from "./FormulaPolicy";

describe("expiresToday", () => {
  it("is true when validUntil falls later the same Paris day", () => {
    // now = 14:00 Paris, validUntil = 23:59:59.999 Paris, même jour.
    expect(
      expiresToday({ validUntilISO: "2026-05-17T21:59:59.999Z" }, "2026-05-17T12:00:00.000Z"),
    ).toBe(true);
  });

  it("is false when validUntil is already past today (expired, not today)", () => {
    expect(
      expiresToday({ validUntilISO: "2026-05-17T11:00:00.000Z" }, "2026-05-17T12:00:00.000Z"),
    ).toBe(false);
  });

  it("is false when validUntil equals now (strict inequality, like isActive)", () => {
    expect(
      expiresToday({ validUntilISO: "2026-05-17T12:00:00.000Z" }, "2026-05-17T12:00:00.000Z"),
    ).toBe(false);
  });

  it("is false when validUntil falls tomorrow", () => {
    expect(
      expiresToday({ validUntilISO: "2026-05-18T08:00:00.000Z" }, "2026-05-17T12:00:00.000Z"),
    ).toBe(false);
  });

  it("uses Paris midnight in summer (CEST, UTC+2)", () => {
    const now = "2026-06-17T20:00:00.000Z"; // 22:00 Paris, 17 juin
    // 23:59:59.999 Paris le 17 juin.
    expect(expiresToday({ validUntilISO: "2026-06-17T21:59:59.999Z" }, now)).toBe(true);
    // 00:30 Paris le 18 juin — lendemain à Paris.
    expect(expiresToday({ validUntilISO: "2026-06-17T22:30:00.000Z" }, now)).toBe(false);
  });

  it("compares Paris days, not UTC days (now past Paris midnight, before UTC midnight)", () => {
    const now = "2026-06-17T23:30:00.000Z"; // 01:30 Paris, 18 juin
    // 23:59 Paris le 18 juin : même jour PARIS, jour UTC différent (17 vs 18).
    expect(expiresToday({ validUntilISO: "2026-06-18T21:59:59.999Z" }, now)).toBe(true);
  });

  it("uses Paris midnight in winter (CET, UTC+1)", () => {
    const now = "2026-01-15T22:30:00.000Z"; // 23:30 Paris, 15 janvier
    expect(expiresToday({ validUntilISO: "2026-01-15T22:59:59.999Z" }, now)).toBe(true);
    // 00:30 Paris le 16 janvier.
    expect(expiresToday({ validUntilISO: "2026-01-15T23:30:00.000Z" }, now)).toBe(false);
  });

  it("stays correct on the DST switch day (29 March 2026)", () => {
    // now = 01:30 Paris (avant le saut), validUntil = 23:59:59.999 Paris (après le saut).
    expect(
      expiresToday({ validUntilISO: "2026-03-29T21:59:59.999Z" }, "2026-03-29T00:30:00.000Z"),
    ).toBe(true);
  });

  it("matches the default expiration of both forms", () => {
    const now = "2026-05-17T12:00:00.000Z";
    expect(expiresToday({ validUntilISO: DailyDishPolicy.defaultExpirationISO(now) }, now)).toBe(
      true,
    );
    expect(expiresToday({ validUntilISO: FormulaPolicy.defaultExpirationISO(now) }, now)).toBe(
      true,
    );
  });

  it("returns false on invalid ISO input instead of throwing", () => {
    const now = "2026-05-17T12:00:00.000Z";
    expect(expiresToday({ validUntilISO: "not-a-date" }, now)).toBe(false);
    expect(expiresToday({ validUntilISO: "" }, now)).toBe(false);
    expect(expiresToday({ validUntilISO: "2026-13-45T99:00:00Z" }, now)).toBe(false);
    expect(expiresToday({ validUntilISO: "2026-05-17T21:59:59.999Z" }, "not-a-date")).toBe(false);
    expect(expiresToday({ validUntilISO: "2026-05-17T21:59:59.999Z" }, "")).toBe(false);
  });
});
