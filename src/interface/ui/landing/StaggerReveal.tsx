"use client";

import { type PropsWithChildren } from "react";
import { LazyMotion, domAnimation, m, type Variants } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { REVEAL_CONTAINER, REVEAL_ITEM } from "@/lib/motion";

type GroupProps = PropsWithChildren<{
  className?: string;
  /** Élément rendu — `ol` (HowItWorks), `ul` (TrustStrip). Les enfants d'un ol/ul DOIVENT être des `StaggerItem as="li"`. */
  as?: "div" | "ol" | "ul";
  /** Sémantique liste explicite (Safari + list-style:none). Passé aux DEUX branches. */
  role?: "list";
  /** Nom accessible de la liste (TrustStrip : « Chiffres clés »). Passé aux DEUX branches. */
  "aria-label"?: string;
}>;

type ItemProps = PropsWithChildren<{
  className?: string;
  as?: "div" | "li";
  /** Variants de l'item — défaut REVEAL_ITEM ; REVEAL_HEADING pour une entrée floutée. Noms `hidden`/`show` obligatoires. */
  variants?: Variants;
}>;

/**
 * Stagger d'entrée pour les grilles landing : le groupe orchestre au `whileInView` (once),
 * chaque `StaggerItem` monte en cascade via les presets partagés `REVEAL_*` (src/lib/motion.ts).
 * Les sections qui l'utilisent sont enveloppées par `MotionSection` (fade seul) — sinon double
 * animation y (section + items). Sous `prefers-reduced-motion` : rendu statique sans wrapper
 * animé (mêmes balises, mêmes classes, même nom accessible).
 *
 * API (référence landing) : `StaggerGroup { className?, as?: "div"|"ol"|"ul", role?: "list",
 * "aria-label"?: string }`, `StaggerItem { className?, as?: "div"|"li", variants?: Variants }`.
 * `as="ol"|"ul"` exige des enfants `StaggerItem as="li"` (HTML valide). `variants` : noms
 * `hidden`/`show` (orchestrés par le groupe) — `REVEAL_ITEM` par défaut, `REVEAL_HEADING` pour
 * une entrée floutée (TrustStrip), `REVEAL_VISUAL` pour une carte-visuel (Pricing/Starter).
 * Cadence : toujours `REVEAL_CONTAINER` (pas de stagger local — son `staggerChildren` est
 * déprécié par motion-dom, à migrer vers `delayChildren: stagger()` dans motion.ts, pas ici).
 * Consommateurs : HowItWorks, Features, Pricing, TrustStrip, FAQ (ProblemGrid : presets
 * directs, pas ce module).
 */
export function StaggerGroup({
  children,
  className,
  as = "div",
  role,
  "aria-label": ariaLabel,
}: GroupProps) {
  const reduce = useReducedMotionSafe();

  if (reduce) {
    const Tag = as;
    return (
      <Tag role={role} aria-label={ariaLabel} className={className}>
        {children}
      </Tag>
    );
  }

  const Comp = as === "ol" ? m.ol : as === "ul" ? m.ul : m.div;
  return (
    <LazyMotion features={domAnimation} strict>
      <Comp
        role={role}
        aria-label={ariaLabel}
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
export function StaggerItem({
  children,
  className,
  as = "div",
  variants = REVEAL_ITEM,
}: ItemProps) {
  const reduce = useReducedMotionSafe();

  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const Comp = as === "li" ? m.li : m.div;
  return (
    <Comp className={className} variants={variants}>
      {children}
    </Comp>
  );
}
