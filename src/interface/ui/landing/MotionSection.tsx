"use client";

import { LazyMotion, domAnimation, m } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { type PropsWithChildren } from "react";
import { EASE_OUT_EXPO } from "@/lib/motion";

type Props = PropsWithChildren<{ className?: string }>;

/**
 * Wrapper reveal-on-scroll (opacity seule) pour les sections landing. Pas de `y` : chaque
 * section porte son propre reveal interne (StaggerGroup, RevealHeading, REVEAL_VISUAL) — un
 * rise du wrapper ferait une double animation y. `LazyMotion + domAnimation` tree-shake le
 * bundle ; `strict` impose `m.*`. Reduced motion ⇒ enfants rendus sans wrapper animé.
 */
export function MotionSection({ children, className }: Props) {
  const reduce = useReducedMotionSafe();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className={className}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
