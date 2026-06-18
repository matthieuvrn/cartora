import { describe, it, expect } from "vitest";
import { APP_TIMEZONE, hourInAppTimeZone, appCalendarDateUTC } from "./appTimeZone";

describe("appTimeZone", () => {
  it("exposes Europe/Paris as the app timezone", () => {
    expect(APP_TIMEZONE).toBe("Europe/Paris");
  });

  describe("hourInAppTimeZone", () => {
    it("converts to Paris hour in summer (CEST, UTC+2)", () => {
      // 09:00 UTC en juin → 11:00 Paris
      expect(hourInAppTimeZone(new Date("2026-06-18T09:00:00.000Z"))).toBe(11);
    });

    it("converts to Paris hour in winter (CET, UTC+1)", () => {
      // 09:00 UTC en janvier → 10:00 Paris
      expect(hourInAppTimeZone(new Date("2026-01-15T09:00:00.000Z"))).toBe(10);
    });

    it("returns 0 (not 24) at Paris midnight", () => {
      // 22:00 UTC en été → 00:00 Paris
      expect(hourInAppTimeZone(new Date("2026-06-18T22:00:00.000Z"))).toBe(0);
      // 23:00 UTC en hiver → 00:00 Paris
      expect(hourInAppTimeZone(new Date("2026-01-15T23:00:00.000Z"))).toBe(0);
    });

    it("returns 23 just before Paris midnight", () => {
      // 21:30 UTC en été → 23:30 Paris
      expect(hourInAppTimeZone(new Date("2026-06-18T21:30:00.000Z"))).toBe(23);
    });
  });

  describe("appCalendarDateUTC", () => {
    it("attaches a post-midnight Paris view to the local calendar day", () => {
      // 23:30 UTC le 17 juin = 01:30 Paris le 18 juin → jour calendaire = 18 juin
      const d = appCalendarDateUTC(new Date("2026-06-17T23:30:00.000Z"));
      expect(d.toISOString()).toBe("2026-06-18T00:00:00.000Z");
    });

    it("keeps a midday view on the same calendar day", () => {
      const d = appCalendarDateUTC(new Date("2026-06-18T12:00:00.000Z"));
      expect(d.toISOString()).toBe("2026-06-18T00:00:00.000Z");
    });

    it("handles the winter offset (UTC+1) correctly", () => {
      // 23:30 UTC le 15 janvier = 00:30 Paris le 16 janvier → jour calendaire = 16 janvier
      const d = appCalendarDateUTC(new Date("2026-01-15T23:30:00.000Z"));
      expect(d.toISOString()).toBe("2026-01-16T00:00:00.000Z");
    });
  });
});
