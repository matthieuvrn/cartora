import { describe, it, expect } from "vitest";
import { AnalyticsPolicy } from "./AnalyticsPolicy";

describe("AnalyticsPolicy", () => {
  describe("parseDeviceType", () => {
    it.each([
      [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
        "MOBILE",
      ],
      [
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36",
        "MOBILE",
      ],
      ["Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1", "TABLET"],
      [
        "Mozilla/5.0 (Linux; Android 14; SM-X810) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Tablet",
        "TABLET",
      ],
      [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        "DESKTOP",
      ],
      ["Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/17.0", "DESKTOP"],
    ] as const)("parses %s as %s", (ua, expected) => {
      expect(AnalyticsPolicy.parseDeviceType(ua)).toBe(expected);
    });

    it("defaults to DESKTOP for empty user agent", () => {
      expect(AnalyticsPolicy.parseDeviceType("")).toBe("DESKTOP");
    });
  });

  describe("parseViewSource", () => {
    it("returns QR when utm_source is qr", () => {
      expect(AnalyticsPolicy.parseViewSource("qr")).toBe("QR");
    });

    it("returns QR even when referrer is present", () => {
      expect(AnalyticsPolicy.parseViewSource("qr", "https://google.com")).toBe("QR");
    });

    it("returns LINK when referrer is present and no utm_source", () => {
      expect(AnalyticsPolicy.parseViewSource(undefined, "https://google.com")).toBe("LINK");
    });

    it("returns DIRECT when neither utm_source nor referrer", () => {
      expect(AnalyticsPolicy.parseViewSource(undefined, undefined)).toBe("DIRECT");
    });

    it("returns DIRECT when referrer is empty string", () => {
      expect(AnalyticsPolicy.parseViewSource(undefined, "")).toBe("DIRECT");
    });
  });

  describe("sanitizeRefererToHost", () => {
    it("returns the bare hostname for a full URL", () => {
      expect(AnalyticsPolicy.sanitizeRefererToHost("https://www.google.com/search?q=foo")).toBe(
        "www.google.com",
      );
    });

    it("returns null for undefined or empty input", () => {
      expect(AnalyticsPolicy.sanitizeRefererToHost(undefined)).toBeNull();
      expect(AnalyticsPolicy.sanitizeRefererToHost("")).toBeNull();
    });

    it("returns null for unparseable input", () => {
      expect(AnalyticsPolicy.sanitizeRefererToHost("not-a-url")).toBeNull();
    });

    it("returns null for non-http(s) schemes", () => {
      expect(AnalyticsPolicy.sanitizeRefererToHost("javascript:alert(1)")).toBeNull();
      expect(AnalyticsPolicy.sanitizeRefererToHost("file:///etc/passwd")).toBeNull();
    });

    it("caps host length at 100 chars defensively", () => {
      const long = `https://${"a".repeat(150)}.com/`;
      const result = AnalyticsPolicy.sanitizeRefererToHost(long);
      expect(result).not.toBeNull();
      expect(result!.length).toBeLessThanOrEqual(100);
    });
  });
});
