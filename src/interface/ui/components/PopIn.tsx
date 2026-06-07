"use client";

import { type ReactNode } from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { SPRING } from "@/lib/motion";

type Props = {
  children: ReactNode;
  className?: string;
  /** `tight` (succès, défaut) ou `bouncy` (franchissement d'étape — petit moment de fierté). */
  spring?: "tight" | "bouncy";
  /**
   * Passé en `key` pour re-déclencher l'animation quand l'état franchit (ex. `step.done`). Omis →
   * l'animation joue une fois au mount.
   */
  animationKey?: string | number | boolean;
};

const SPRINGS = { tight: SPRING.tightSpring, bouncy: SPRING.bouncySpring } as const;

/**
 * Scale-in d'une icône (success state, coche d'étape) : 1 cycle puis stop, sobre. Si l'utilisateur
 * réduit le mouvement, on rend l'enfant tel quel (aucun scale). Inline (`span`) pour ne pas casser
 * le flux d'un libellé.
 */
export function PopIn({ children, className, spring = "tight", animationKey }: Props) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{children}</span>;

  return (
    <LazyMotion features={domAnimation} strict>
      <m.span
        key={animationKey === undefined ? undefined : String(animationKey)}
        className={className}
        style={{ display: "inline-flex" }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={SPRINGS[spring]}
      >
        {children}
      </m.span>
    </LazyMotion>
  );
}
