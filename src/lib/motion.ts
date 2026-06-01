import type { Transition } from "motion/react";

/**
 * Presets motion partagés (landing). Consommés par MotionSection et les composants
 * landing des étapes suivantes. Voir docs/ui-refonte-2026.md §8.
 */

// ease-out-expo : entrées éditoriales (cf. token CSS --ease-out-expo).
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const SPRING = {
  softSpring: { type: "spring", stiffness: 120, damping: 20, mass: 1 },
  bouncySpring: { type: "spring", stiffness: 280, damping: 18, mass: 0.6 },
  tightSpring: { type: "spring", stiffness: 420, damping: 28, mass: 0.8 },
} satisfies Record<string, Transition>;

export const FADE_UP = (delay = 0) =>
  ({
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "0px 0px -10% 0px" },
    transition: { duration: 0.7, ease: EASE_OUT_EXPO, delay },
  }) as const;

export const STAGGER_CONTAINER = {
  initial: {},
  whileInView: {},
  viewport: { once: true, margin: "0px 0px -10% 0px" },
  transition: { staggerChildren: 0.08 },
} as const;
