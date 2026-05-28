"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { trackLandingEvent } from "@/interface/ui/landing/trackLandingEvent";

/**
 * Fires a single `scroll_depth_75` landing event when the user has scrolled
 * past 75% of the document height. Tracked once per page load (page refresh
 * resets the flag — that matches "engagement per session" semantics).
 *
 * Placed at the end of <main> in src/app/page.tsx. Listener uses passive
 * scroll + rAF throttling to keep INP healthy.
 */
export function ScrollDepthTracker() {
  const locale = useLocale();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;

    let rafId: number | null = null;

    const check = () => {
      rafId = null;
      if (firedRef.current) return;
      const scrollTop = window.scrollY;
      const viewportHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const scrollable = docHeight - viewportHeight;
      if (scrollable <= 0) return;
      const depth = (scrollTop + viewportHeight) / docHeight;
      if (depth >= 0.75) {
        firedRef.current = true;
        trackLandingEvent({ event: "scroll_depth_75", locale });
        window.removeEventListener("scroll", onScroll);
      }
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(check);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Initial check in case the page is short enough that 75% is already in view.
    check();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [locale]);

  return null;
}
