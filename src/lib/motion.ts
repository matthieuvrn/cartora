import type { Transition } from "motion/react";

/**
 * Presets motion partagés (landing + app produit) — SOURCE UNIQUE des constantes TS.
 * `EASE_OUT_EXPO` est le miroir du token CSS `--ease-out-expo` (globals.css) : garder les
 * deux en phase. `REVEAL_*` alimente HeroIntro et StaggerReveal (grilles landing) ; réutilisable
 * par le reveal du dashboard (étape 7, cf. docs/ui-harmonisation-app-2026.md).
 * Voir aussi docs/ui-refonte-2026.md §8.
 */

// ease-out-expo : entrées éditoriales (miroir du token CSS --ease-out-expo).
export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const SPRING = {
  softSpring: { type: "spring", stiffness: 120, damping: 20, mass: 1 },
  bouncySpring: { type: "spring", stiffness: 280, damping: 18, mass: 0.6 },
  tightSpring: { type: "spring", stiffness: 420, damping: 28, mass: 0.8 },
} satisfies Record<string, Transition>;

/**
 * Reveal d'arrivée en cascade. Variants nommés `hidden`/`show` : le conteneur orchestre via
 * `staggerChildren`, chaque enfant porte `REVEAL_ITEM`. Consommé par HeroIntro (mount) et
 * StaggerReveal (`whileInView`, grilles landing). Toujours derrière `useReducedMotion()`
 * côté composant.
 */
export const REVEAL_CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
} as const;

export const REVEAL_ITEM = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT_EXPO } },
} as const;

/**
 * Vocabulaire différencié par type de contenu (DA 2026) — le fade-up universel est réservé
 * aux items de grille (REVEAL_ITEM) ; les titres display et les visuels ont leur propre voix.
 * Le blur est volontairement limité aux headings (surface réduite → compositing bon marché).
 */
export const REVEAL_HEADING = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: EASE_OUT_EXPO },
  },
} as const;

export const REVEAL_VISUAL = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: EASE_OUT_EXPO } },
} as const;
