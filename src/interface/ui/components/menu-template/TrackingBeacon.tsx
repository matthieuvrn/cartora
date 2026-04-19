"use client";

import { useEffect } from "react";
import { useConsent } from "@/interface/ui/components/consent/ConsentContext";

type TrackingBeaconProps = {
  slug: string;
  locale: string;
};

export function TrackingBeacon({ slug, locale }: TrackingBeaconProps) {
  const { status } = useConsent();

  useEffect(() => {
    if (status !== "accepted") return;

    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source") ?? undefined;

    navigator.sendBeacon("/api/track", JSON.stringify({ slug, locale, source }));
  }, [slug, locale, status]);

  return null;
}
