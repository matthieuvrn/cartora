import { describe, it, expect } from "vitest";
import { formatBillingAmount, formatBillingDate } from "./billing-format";

describe("formatBillingDate", () => {
  it("formats in Paris time, long style, per locale", () => {
    // 23:30 UTC le 14 octobre = 01:30 le 15 octobre à Paris (CEST).
    const iso = "2026-10-14T23:30:00.000Z";
    expect(formatBillingDate(iso, "fr")).toBe("15 octobre 2026");
    expect(formatBillingDate(iso, "en")).toBe("15 October 2026");
  });

  it("falls back to French for an unknown locale and returns '' on invalid input", () => {
    expect(formatBillingDate("2026-01-05T12:00:00.000Z", "de")).toBe("5 janvier 2026");
    expect(formatBillingDate("not-a-date", "fr")).toBe("");
  });
});

describe("formatBillingAmount", () => {
  it("formats euro cents per locale (Stripe sends the currency in lowercase)", () => {
    // ICU sépare le symbole par une espace fine insécable (U+202F) en fr-FR : `\s` la couvre.
    expect(formatBillingAmount(1327, "eur", "fr")).toMatch(/^13,27\s€$/);
    expect(formatBillingAmount(1327, "eur", "en")).toBe("€13.27");
    expect(formatBillingAmount(0, "eur", "fr")).toMatch(/^0,00\s€$/);
  });
});
