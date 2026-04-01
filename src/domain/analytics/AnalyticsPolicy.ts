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
}
