import type { LandingEventName } from "@/domain/analytics/LandingEventNames";

interface TrackPayload {
  event: LandingEventName;
  locale: string;
  metadata?: Record<string, unknown>;
}

export function trackLandingEvent({ event, locale, metadata }: TrackPayload) {
  const payload = JSON.stringify({
    type: "landing",
    event,
    locale: locale === "en" ? "en" : "fr",
    ...(metadata ? { metadata } : {}),
  });

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon("/api/track", blob)) return;
  }
  void fetch("/api/track", {
    method: "POST",
    body: payload,
    keepalive: true,
    headers: { "Content-Type": "application/json" },
  }).catch(() => {});
}
