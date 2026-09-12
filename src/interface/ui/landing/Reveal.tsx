"use client";

import { LazyMotion, domAnimation, m } from "motion/react";
import type { PropsWithChildren } from "react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { REVEAL_HEADING, REVEAL_VISUAL } from "@/lib/motion";

const VIEWPORT = { once: true, margin: "0px 0px -10% 0px" } as const;

type HeadingProps = PropsWithChildren<{
  /** Balise rendue — h2 (titres de section) ; h3 réservé à un usage futur. */
  as?: "h2" | "h3";
  /** Forwardé tel quel : cible de `aria-labelledby` de la section. */
  id?: string;
  className?: string;
}>;

/**
 * Titre de section révélé en « mise au point » (REVEAL_HEADING : y 16 + blur 6 → 0, 0,7 s ;
 * le preset pose `filter: none` en fin d'entrée via `transitionEnd` — aucune copie locale ici,
 * un seul mécanisme pour la landing, cf. motion.ts). Rend la VRAIE balise (m.h2) — jamais un
 * div autour du titre : le flux du header et l'id restent intacts. Jamais sur le h1 (LCP).
 * Sous PRM : balise nue. Consommateurs : Problème, Démo, Pricing, FAQ, Clôture.
 */
export function RevealHeading({ as = "h2", id, className, children }: HeadingProps) {
  const reduce = useReducedMotionSafe();
  if (reduce) {
    const Tag = as;
    return (
      <Tag id={id} className={className}>
        {children}
      </Tag>
    );
  }
  const Comp = as === "h3" ? m.h3 : m.h2;
  return (
    <LazyMotion features={domAnimation} strict>
      <Comp
        id={id}
        className={className}
        variants={REVEAL_HEADING}
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
      >
        {children}
      </Comp>
    </LazyMotion>
  );
}

type VisualProps = PropsWithChildren<{
  className?: string;
  /** Décalage (s) après l'entrée dans le viewport. */
  delay?: number;
}>;

/**
 * Bloc « visuel » révélé (REVEAL_VISUAL : y 12 + scale 0,96 → 1, 0,8 s). Orchestre hidden/show :
 * ses descendants `m.*` porteurs de variants (HighlightSweep) héritent du déclenchement — et,
 * au SSR, de la valeur `hidden` (sérialisée inline dans le HTML prérendu). Consommateur : aside
 * du constat. Ne PAS l'utiliser sur un item de StaggerGroup (double orchestration) : là, passer
 * `variants={REVEAL_VISUAL}` à StaggerItem (carte Starter).
 */
export function RevealVisual({ className, delay = 0, children }: VisualProps) {
  const reduce = useReducedMotionSafe();
  if (reduce) return <div className={className}>{children}</div>;
  const variants = delay
    ? {
        hidden: REVEAL_VISUAL.hidden,
        show: {
          ...REVEAL_VISUAL.show,
          transition: { ...REVEAL_VISUAL.show.transition, delay },
        },
      }
    : REVEAL_VISUAL;
  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className={className}
        variants={variants}
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
