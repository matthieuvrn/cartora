"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { type PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  className?: string;
  /** Décalage d'entrée (s) — crée un effet de cascade entre sections. */
  delay?: number;
}>;

/**
 * Wrapper reveal-on-scroll pour les sections landing. `LazyMotion + domAnimation` tree-shake
 * le bundle ; `strict` impose l'usage de `m.*` (pas `motion.*`). Si l'utilisateur préfère
 * réduire le mouvement, on rend les enfants sans wrapper animé (le CSS global gère le reste).
 */
export function MotionSection({ children, className, delay = 0 }: Props) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className={className}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
