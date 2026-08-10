"use client";

import { LazyMotion, domAnimation, m } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { type PropsWithChildren } from "react";
import { EASE_OUT_EXPO } from "@/lib/motion";

type Props = PropsWithChildren<{
  className?: string;
  /** Décalage d'entrée (s) — crée un effet de cascade entre sections. */
  delay?: number;
  /**
   * `rise` (défaut) : opacity + y. `fade` : opacity seule — pour les sections dont la grille
   * interne stagger déjà ses items (StaggerReveal), sinon double animation y.
   */
  variant?: "rise" | "fade";
}>;

/**
 * Wrapper reveal-on-scroll pour les sections landing. `LazyMotion + domAnimation` tree-shake
 * le bundle ; `strict` impose l'usage de `m.*` (pas `motion.*`). Si l'utilisateur préfère
 * réduire le mouvement, on rend les enfants sans wrapper animé (le CSS global gère le reste).
 */
export function MotionSection({ children, className, delay = 0, variant = "rise" }: Props) {
  const reduce = useReducedMotionSafe();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className={className}
        initial={variant === "rise" ? { opacity: 0, y: 24 } : { opacity: 0 }}
        whileInView={variant === "rise" ? { opacity: 1, y: 0 } : { opacity: 1 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: variant === "rise" ? 0.7 : 0.5, ease: EASE_OUT_EXPO, delay }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
