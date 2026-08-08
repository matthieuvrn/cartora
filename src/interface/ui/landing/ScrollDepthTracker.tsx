"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import type { LandingEventName } from "@/domain/analytics/LandingEventNames";
import { trackLandingEvent } from "@/interface/ui/landing/trackLandingEvent";

/**
 * Fires `scroll_depth_25/50/75/100` landing events as the user crosses each depth
 * threshold, once per page load (page refresh resets — "engagement per session").
 * Multi-seuils : localise OÙ la page perd ses visiteurs (après le hero ? avant le
 * pricing ?), ce qu'un seuil unique ne permet pas.
 *
 * Le seuil "100" se déclenche à 98% : la somme scrollTop + viewport n'atteint pas
 * toujours exactement scrollHeight (arrondis sous-pixel, barre d'URL mobile).
 *
 * Placed at the end of <main> in src/app/page.tsx. Listener uses passive
 * scroll + rAF throttling to keep INP healthy.
 */
const DEPTH_THRESHOLDS: ReadonlyArray<readonly [number, LandingEventName]> = [
  [0.25, "scroll_depth_25"],
  [0.5, "scroll_depth_50"],
  [0.75, "scroll_depth_75"],
  [0.98, "scroll_depth_100"],
];

export function ScrollDepthTracker() {
  const locale = useLocale();
  const firedRef = useRef<Set<LandingEventName>>(new Set());

  useEffect(() => {
    let rafId: number | null = null;

    const check = () => {
      rafId = null;
      const fired = firedRef.current;
      if (fired.size === DEPTH_THRESHOLDS.length) return;
      const scrollTop = window.scrollY;
      const viewportHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (docHeight - viewportHeight <= 0) return;
      const depth = (scrollTop + viewportHeight) / docHeight;
      for (const [threshold, event] of DEPTH_THRESHOLDS) {
        if (depth >= threshold && !fired.has(event)) {
          fired.add(event);
          trackLandingEvent({ event, locale });
        }
      }
      if (fired.size === DEPTH_THRESHOLDS.length) {
        window.removeEventListener("scroll", onScroll);
      }
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(check);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Initial check in case the page is short enough that thresholds are already in view.
    check();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [locale]);

  return null;
}
