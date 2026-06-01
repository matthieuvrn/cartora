"use client";

import { useRef } from "react";
import {
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

/**
 * Ligne pointillée sapin reliant les 3 étapes (desktop uniquement), dessinée de gauche à
 * droite au scroll via `scaleX` piloté par `useScroll`. Placée derrière les cards opaques :
 * elle n'apparaît que dans les gouttières entre colonnes → effet « connexion ». Si
 * `prefers-reduced-motion`, la ligne est rendue statique et entière.
 */
export function HowItWorksProgressLine() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "center 55%"] });
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const POS = "pointer-events-none absolute top-[2.75rem] right-[16%] left-[16%] hidden lg:block";

  if (reduce) {
    return (
      <div className={POS} aria-hidden="true">
        <div className="border-t-2 border-dashed border-sapin-400/70" />
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <div className={POS} aria-hidden="true">
        <m.div
          ref={ref}
          style={{ scaleX }}
          className="origin-left border-t-2 border-dashed border-sapin-400/70"
        />
      </div>
    </LazyMotion>
  );
}
