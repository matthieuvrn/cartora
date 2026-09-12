"use client";

import { m } from "motion/react";
import type { PropsWithChildren } from "react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { EASE_OUT_EXPO } from "@/lib/motion";

// not-italic EXPLICITE : l'UA met <em> en italique et Geist (paragraphe text-body-lg) n'a pas de
// face italique chargée — une oblique synthétisée serait le seul faux italique de la page (how.md D4).
const CLASS = "highlight-sweep font-medium text-canard-950 not-italic";

// Variants nommés comme REVEAL_* : hérités de l'ancêtre orchestrateur (RevealVisual).
const SWEEP = {
  hidden: { backgroundSize: "0% 100%" },
  show: {
    backgroundSize: "100% 100%",
    transition: { duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.35 },
  },
} as const;

/**
 * Surlignage « craie » sand-200 (lavis, `.highlight-sweep` de globals.css) qui balaie derrière
 * un groupe de mots — la chute de l'aside du constat. Arbitrage frontière constat → méthode,
 * variante A : le climax corail de ce voisinage est porté par « environ 10 minutes » (corail-600,
 * étape 2 de Comment ça marche) ; ici la matière est un lavis sand-200 sur porcelaine, jamais
 * corail-200 (deux climax co-visibles). Contraste du texte : canard-950 sur sand-200 ≈ 13:1.
 * Enfant de variants : DOIT vivre sous un `m.*` orchestrant hidden/show dans le même arbre
 * React (RevealVisual), qui fournit aussi le LazyMotion (aucun LazyMotion propre ici).
 * États : sous l'orchestrateur, prérendu à 0 % (initial hérité, sérialisé au SSR) puis balayé
 * au `show` — sans JS, jamais surligné (comme tout whileInView de la page) ; sous un
 * orchestrateur jamais déclenché, reste à 0 % ; hors de tout orchestrateur, aucun style
 * inline → état CSS plein, immobile ; hors de tout LazyMotion, rend sans features (statique).
 * PRM : `<em>` nu, surligné d'emblée.
 */
export function HighlightSweep({ children }: PropsWithChildren) {
  const reduce = useReducedMotionSafe();
  if (reduce) return <em className={CLASS}>{children}</em>;
  return (
    <m.em className={CLASS} variants={SWEEP}>
      {children}
    </m.em>
  );
}
