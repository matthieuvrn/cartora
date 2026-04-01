"use client";

import { useEffect } from "react";

type TrackingBeaconProps = {
  slug: string;
  locale: string;
};

export function TrackingBeacon({ slug, locale }: TrackingBeaconProps) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source") ?? undefined;

    navigator.sendBeacon(
      "/api/track",
      JSON.stringify({ slug, locale, source, screenWidth: window.innerWidth }),
    );
  }, [slug, locale]);

  return null;
}
