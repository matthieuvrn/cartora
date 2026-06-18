"use client";

import { useEffect } from "react";
import { useConsent } from "@/interface/ui/components/consent/ConsentContext";

type TrackingBeaconProps = {
  slug: string;
  locale: string;
};

// Une vue est comptée une seule fois par session d'onglet et par menu :
// empêche le double-fire du Strict Mode (dev) et les rechargements du même client.
function alreadyTracked(slug: string): boolean {
  try {
    const key = `cartora-mv-${slug}`;
    if (sessionStorage.getItem(key)) return true;
    sessionStorage.setItem(key, "1");
    return false;
  } catch {
    // sessionStorage indisponible (navigation privée stricte) : on laisse passer la vue.
    return false;
  }
}

export function TrackingBeacon({ slug, locale }: TrackingBeaconProps) {
  const { status } = useConsent();

  useEffect(() => {
    if (status !== "accepted") return;
    if (alreadyTracked(slug)) return;

    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source") ?? undefined;

    navigator.sendBeacon("/api/track", JSON.stringify({ slug, locale, source }));
  }, [slug, locale, status]);

  return null;
}
