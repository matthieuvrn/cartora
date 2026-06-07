"use client";

import { Children, type ReactNode } from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { REVEAL_CONTAINER, REVEAL_ITEM } from "@/lib/motion";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Reveal d'arrivée en cascade pour les sections du dashboard (étape 7). Chaque enfant direct est
 * enveloppé d'un `m.div` orchestré par le conteneur (`staggerChildren`) — on mirrore le pattern
 * landing fonctionnel (HeroIntro), pas les presets `whileInView` qui ne staggèrent pas.
 *
 * `Children.map` saute `null`/`false` (les `{cond && <X/>}`) et aplatit les `.map(...)` → on remplace
 * un simple wrapper `<div className>` sans toucher au markup des sections. `animate="show"` joue au
 * mount (once implicite, pas d'IntersectionObserver). Si l'utilisateur réduit le mouvement, on rend
 * les enfants tels quels (aucun `opacity:0` initial).
 */
export function StaggerReveal({ children, className }: Props) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div className={className} variants={REVEAL_CONTAINER} initial="hidden" animate="show">
        {Children.map(children, (child) => (
          <m.div variants={REVEAL_ITEM}>{child}</m.div>
        ))}
      </m.div>
    </LazyMotion>
  );
}
