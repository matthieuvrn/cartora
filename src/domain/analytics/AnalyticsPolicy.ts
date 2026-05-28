import type { DeviceType, ViewSource } from "./AnalyticsTypes";

const TABLET_PATTERN = /tablet|ipad/i;
const MOBILE_PATTERN = /mobile|iphone|ipod|android(?!.*tablet)|windows phone/i;

export class AnalyticsPolicy {
  static parseDeviceType(userAgent: string): DeviceType {
    if (TABLET_PATTERN.test(userAgent)) return "TABLET";
    if (MOBILE_PATTERN.test(userAgent)) return "MOBILE";
    return "DESKTOP";
  }

  static parseViewSource(utmSource?: string, referrer?: string): ViewSource {
    if (utmSource === "qr") return "QR";
    if (referrer && referrer.length > 0) return "LINK";
    return "DIRECT";
  }

  /**
   * RGPD-safe referer collection: keep only the hostname (no path, no query),
   * which is anonymous by construction. Used by landing analytics where the
   * domain referring source is enough signal — full URLs may contain PII.
   * Returns null for empty, unparseable, or non-http(s) inputs.
   */
  static sanitizeRefererToHost(referer?: string): string | null {
    if (!referer || referer.length === 0) return null;
    try {
      const url = new URL(referer);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      const host = url.hostname;
      if (host.length === 0) return null;
      return host.slice(0, 100);
    } catch {
      return null;
    }
  }
}
