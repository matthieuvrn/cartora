"use client";

import { type PropsWithChildren } from "react";
import { LazyMotion, domAnimation, m } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { REVEAL_CONTAINER, REVEAL_ITEM } from "@/lib/motion";

type GroupProps = PropsWithChildren<{
  className?: string;
  /** Élément rendu — `ol` pour les listes ordonnées (HowItWorks). */
  as?: "div" | "ol";
}>;

type ItemProps = PropsWithChildren<{
  className?: string;
  as?: "div" | "li";
}>;

/**
 * Stagger d'entrée pour les grilles landing (Problème, Features, Pricing, HowItWorks) :
 * le groupe orchestre au `whileInView` (once), chaque `StaggerItem` monte en cascade via
 * les presets partagés `REVEAL_*` (src/lib/motion.ts). Les sections qui l'utilisent passent
 * leur `MotionSection` en `variant="fade"` — sinon double animation y (section + items).
 * Sous `prefers-reduced-motion` : rendu statique sans wrapper animé.
 */
export function StaggerGroup({ children, className, as = "div" }: GroupProps) {
  const reduce = useReducedMotionSafe();

  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const Comp = as === "ol" ? m.ol : m.div;
  return (
    <LazyMotion features={domAnimation} strict>
      <Comp
        className={className}
        variants={REVEAL_CONTAINER}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      >
        {children}
      </Comp>
    </LazyMotion>
  );
}

/** Enfant d'un `StaggerGroup` — hérite du contexte LazyMotion du groupe (même arbre React). */
export function StaggerItem({ children, className, as = "div" }: ItemProps) {
  const reduce = useReducedMotionSafe();

  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const Comp = as === "li" ? m.li : m.div;
  return (
    <Comp className={className} variants={REVEAL_ITEM}>
      {children}
    </Comp>
  );
}
