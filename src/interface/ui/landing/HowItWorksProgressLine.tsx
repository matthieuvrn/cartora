"use client";

import { LazyMotion, domAnimation, m } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { EASE_OUT_EXPO } from "@/lib/motion";

/**
 * « Ligne de métro » des 3 étapes (desktop uniquement, in-flow au-dessus de la grille) :
 * route pointillée sand + tracé canard révélé au scroll-in avec 3 checkpoints sapin alignés
 * sur les débuts de colonnes (0 / 33,3 / 66,6 %). La révélation anime `clip-path` (inset) —
 * jamais `scaleX`, qui étirait le motif pointillé (défaut v1). Sous `prefers-reduced-motion`,
 * le tracé est rendu entier et statique.
 */

const CHECKPOINTS = ["0%", "33.333%", "66.666%"] as const;

function Track() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-x-0 top-1/2 border-t border-canard-400" />
      {CHECKPOINTS.map((left) => (
        <span
          key={left}
          className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-sapin-500"
          style={{ left }}
        />
      ))}
    </div>
  );
}

export function HowItWorksProgressLine() {
  const reduce = useReducedMotionSafe();

  const base = (
    <div aria-hidden="true" className="relative mb-12 hidden h-2 md:block">
      {/* Route de fond : pointillés discrets sur toute la largeur. */}
      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-sand-300" />
      {reduce ? (
        <Track />
      ) : (
        <LazyMotion features={domAnimation} strict>
          <m.div
            className="absolute inset-0"
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            whileInView={{ clipPath: "inset(0 0% 0 0)" }}
            viewport={{ once: true, margin: "0px 0px -15% 0px" }}
            transition={{ duration: 1.1, ease: EASE_OUT_EXPO, delay: 0.15 }}
          >
            <Track />
          </m.div>
        </LazyMotion>
      )}
    </div>
  );

  return base;
}
