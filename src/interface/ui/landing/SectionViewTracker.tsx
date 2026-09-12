"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { trackLandingEvent } from "@/interface/ui/landing/trackLandingEvent";

/**
 * Events d'impression par section : un `section_view` (metadata.section = id DOM) la première
 * fois que ≥ 20 % de la section entre dans le viewport, une seule fois par page load.
 * Fournit le dénominateur des CTR — sans impression, les clics `cta_*` n'ont pas de base
 * de comparaison (« X % de ceux qui ont VU le pricing ont cliqué »).
 *
 * Seuil à 0.2 (pas plus haut) : un threshold supérieur à viewport/hauteur-de-section ne se
 * déclenche JAMAIS sur les sections plus hautes que l'écran (pricing mobile ~1800px).
 *
 * Dépend de `reduce` : la bascule `prefers-reduced-motion` post-hydratation remonte les
 * `<section>` (wrappers motion → div) — l'effet se rejoue sur les nouveaux nœuds. `fired`
 * (ref, par page load) garantit qu'une section déjà envoyée ne l'est pas une seconde fois.
 */
export function SectionViewTracker({ sectionIds }: { sectionIds: readonly string[] }) {
  const locale = useLocale();
  const reduce = useReducedMotionSafe();
  const fired = useRef(new Set<string>());

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    for (const id of sectionIds) {
      if (fired.current.has(id)) continue;
      const el = document.getElementById(id);
      if (!el) continue;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          fired.current.add(id);
          trackLandingEvent({ event: "section_view", locale, metadata: { section: id } });
          io.disconnect();
        },
        { threshold: 0.2 },
      );
      io.observe(el);
      observers.push(io);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [locale, sectionIds, reduce]);

  return null;
}
