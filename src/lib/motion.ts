import type { Transition } from "motion/react";

/**
 * Presets motion partagés (landing + app produit). `SPRING`/`EASE_OUT_EXPO` consommés par
 * MotionSection et les composants landing ; `REVEAL_*` par le reveal du dashboard (étape 7,
 * cf. docs/ui-harmonisation-app-2026.md). Voir aussi docs/ui-refonte-2026.md §8.
 */

// ease-out-expo : entrées éditoriales (cf. token CSS --ease-out-expo).
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const SPRING = {
  softSpring: { type: "spring", stiffness: 120, damping: 20, mass: 1 },
  bouncySpring: { type: "spring", stiffness: 280, damping: 18, mass: 0.6 },
  tightSpring: { type: "spring", stiffness: 420, damping: 28, mass: 0.8 },
} satisfies Record<string, Transition>;

/**
 * Reveal d'arrivée en cascade (app produit, étape 7). Variants nommés `hidden`/`show` :
 * le conteneur orchestre via `staggerChildren`, chaque enfant porte `REVEAL_ITEM`. Calqué sur
 * le pattern landing fonctionnel (HeroIntro CONTAINER/ITEM). À monter avec `initial="hidden"
 * animate="show"` au mount. Toujours derrière `useReducedMotion()` côté composant.
 */
export const REVEAL_CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
} as const;

export const REVEAL_ITEM = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT_EXPO } },
} as const;
