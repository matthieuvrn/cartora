"use client";

import { useRef, type PropsWithChildren, type ReactNode } from "react";
import { LazyMotion, domAnimation, m, useScroll, useTransform } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { EASE_OUT_EXPO, REVEAL_VISUAL } from "@/lib/motion";
import { cn } from "@/lib/utils";

type HeroPhoneProps = PropsWithChildren<{
  /** Largeur du téléphone (ex. "w-[280px] md:w-[320px]"). */
  className?: string;
  /** Suspend le float idle (bouton pause WCAG 2.2.2 du bloc démo — cf. HeroLiveDemo). */
  paused?: boolean;
  /**
   * Satellite (chevalet QR) rendu DANS la couche float/parallaxe, hors sous-arbre aria-hidden
   * (le QR scannable reste exposé aux AT) ; le consommateur positionne lui-même son contenu
   * (absolute) dans l'overlay inset-0, pointer-events coupés par défaut.
   */
  aside?: ReactNode;
}>;

// Cascade du hero (cf. HeroIntro HERO_CASCADE) : le téléphone atterrit 0,3 → 1,0 s, entre le
// brush (0,35 s) et le sous-titre (0,45 s) — l'œil lit gauche (climax) puis droite (objet).
const PHONE_ENTRANCE_DELAY = 0.3;
// Le chevalet QR se pose APRÈS le téléphone (0,65 → 1,45 s).
const ASIDE_ENTRANCE_DELAY = PHONE_ENTRANCE_DELAY + 0.35;
// REVEAL_VISUAL n'a pas de slot delay → variante locale composée. Le scale 0,96 → 1 de
// l'overlay pleine taille tourne autour du centre du téléphone : le chevalet, en bas à gauche,
// « se pose » en glissant de quelques px vers son coin — voulu.
const ASIDE_REVEAL = {
  hidden: REVEAL_VISUAL.hidden,
  show: {
    ...REVEAL_VISUAL.show,
    transition: { ...REVEAL_VISUAL.show.transition, delay: ASIDE_ENTRANCE_DELAY },
  },
} as const;

/**
 * Coquille motion du hero autour du téléphone (children = `PhoneMockup` + écran) :
 *  - halo canard flou derrière le téléphone (ancre la colonne, remplit le vide),
 *  - entrée fade-up légère au chargement (delay → cascade après le texte),
 *  - float idle ±6px et parallaxe pilotée au scroll (mirror de `BrowserMockup`),
 *  - chaque transform sur sa propre couche pour ne pas se disputer la valeur `y`,
 *  - `aside` (chevalet QR) solidaire de la couche float : un seul mouvement pour les deux
 *    objets (parallaxe, entrée décalée, float), plus jamais de croisement au scroll.
 * Sous `prefers-reduced-motion` : halo + téléphone + chevalet statiques, aucun mouvement.
 * Le LazyMotion posé ici sert aussi de contexte aux `m.*` du menu vivant enfant
 * (HeroLiveDemo — même arbre React).
 */
export function HeroPhone({ className, paused = false, aside, children }: HeroPhoneProps) {
  const reduce = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [24, -24]);

  // Double halo sur scène nuit : assise teal large + cœur plus clair — le téléphone est
  // « éclairé », pas posé sur du noir plat.
  const halo = (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 m-auto h-[95%] w-[95%] rounded-full bg-canard-500/30 blur-3xl" />
      <div className="absolute inset-0 m-auto h-1/2 w-1/2 rounded-full bg-canard-300/20 blur-2xl" />
    </div>
  );

  if (reduce) {
    return (
      <div ref={ref} className={cn("relative isolate", className)}>
        {halo}
        {children}
        {aside && <div className="pointer-events-none absolute inset-0 z-10">{aside}</div>}
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
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: PHONE_ENTRANCE_DELAY }}
          >
            {/* Couche float idle (boucle infinie subtile, suspendue par le bouton pause) —
                `relative` : elle porte l'overlay du chevalet. */}
            <m.div
              className="relative"
              animate={paused ? { y: 0 } : { y: [0, -5, 0] }}
              transition={
                paused
                  ? { duration: 0.3, ease: "easeOut" }
                  : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }
              }
            >
              {children}
              {aside && (
                <m.div
                  className="pointer-events-none absolute inset-0 z-10"
                  variants={ASIDE_REVEAL}
                  initial="hidden"
                  animate="show"
                >
                  {aside}
                </m.div>
              )}
            </m.div>
          </m.div>
        </m.div>
      </LazyMotion>
    </div>
  );
}
