"use client";

import { type PropsWithChildren, useState } from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

// Glow canard en rgba (#2c5a66 = 44,90,102) — rgba s'interpole de façon fiable dans
// motion, contrairement à oklch dans une boxShadow keyframée.
const GLOW_LOW = "0 0 0 1px rgba(44,90,102,0.18), 0 0 24px -4px rgba(44,90,102,0.35)";
const GLOW_HIGH = "0 0 0 1px rgba(44,90,102,0.25), 0 0 36px -2px rgba(44,90,102,0.55)";

/**
 * Enveloppe "breath" pour le CTA final : cycle scale 1↔1.02 + glow 0.35↔0.55 sur 2.5s,
 * mis en pause au survol (laisse cliquer sans que le bouton bouge). Respecte
 * `prefers-reduced-motion` (rendu statique, sans wrapper animé). Cf. §9.13.
 */
export function BreathingCta({ children }: PropsWithChildren) {
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);

  if (reduce) return <span className="inline-flex rounded-md">{children}</span>;

  return (
    <LazyMotion features={domAnimation} strict>
      <m.span
        className="inline-flex rounded-md"
        onHoverStart={() => setPaused(true)}
        onHoverEnd={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        animate={
          paused
            ? { scale: 1, boxShadow: GLOW_LOW }
            : { scale: [1, 1.02, 1], boxShadow: [GLOW_LOW, GLOW_HIGH, GLOW_LOW] }
        }
        transition={
          paused
            ? { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
            : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {children}
      </m.span>
    </LazyMotion>
  );
}
