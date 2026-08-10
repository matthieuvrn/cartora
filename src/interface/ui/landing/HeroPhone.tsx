"use client";

import { useRef, type PropsWithChildren } from "react";
import { LazyMotion, domAnimation, m, useScroll, useTransform } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

type HeroPhoneProps = PropsWithChildren<{
  /** Largeur du téléphone (ex. "w-[280px] md:w-[320px]"). */
  className?: string;
  /** Suspend le float idle (bouton pause WCAG 2.2.2 du bloc démo — cf. HeroLiveDemo). */
  paused?: boolean;
}>;

/**
 * Coquille motion du hero autour du téléphone (children = `PhoneMockup` + écran) :
 *  - halo canard flou derrière le téléphone (ancre la colonne, remplit le vide),
 *  - entrée fade-up légère au chargement (delay → cascade après le texte),
 *  - float idle ±6px et parallaxe pilotée au scroll (mirror de `BrowserMockup`),
 *  - chaque transform sur sa propre couche pour ne pas se disputer la valeur `y`.
 * Sous `prefers-reduced-motion` : halo + téléphone statiques, aucun mouvement.
 * Le LazyMotion posé ici sert aussi de contexte aux `m.*` du menu vivant enfant
 * (HeroLiveDemo — même arbre React). Cf. docs/ui-refonte-2026.md §8.
 */
export function HeroPhone({ className, paused = false, children }: HeroPhoneProps) {
  const reduce = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [24, -24]);

  const halo = (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 m-auto h-3/4 w-3/4 rounded-full bg-canard-400/25 blur-3xl"
    />
  );

  if (reduce) {
    return (
      <div ref={ref} className={cn("relative isolate", className)}>
        {halo}
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative isolate", className)}>
      {halo}
      <LazyMotion features={domAnimation} strict>
        {/* Couche parallaxe (scroll) */}
        <m.div style={{ y: parallaxY }}>
          {/* Couche entrée (one-shot au chargement) */}
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.15 }}
          >
            {/* Couche float idle (boucle infinie subtile, suspendue par le bouton pause) */}
            <m.div
              animate={paused ? { y: 0 } : { y: [0, -6, 0] }}
              transition={
                paused
                  ? { duration: 0.3, ease: "easeOut" }
                  : { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }
            >
              {children}
            </m.div>
          </m.div>
        </m.div>
      </LazyMotion>
    </div>
  );
}
