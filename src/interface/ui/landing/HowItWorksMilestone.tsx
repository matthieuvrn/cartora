"use client";

import { m } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Jalon de « Comment ça marche » : pastille + tronçon canard (+ route mobile), ANCRÉS dans
 * chaque <li> (premier enfant d'un StaggerItem). La ROUTE DESKTOP n'est PAS ici : elle est un
 * span statique dans LandingHowItWorks (hors stagger — un li démarre à opacity 0).
 * Desktop (≥ md) : tronçon révélé par clip-path gauche → droite (variants hidden/show hérités du
 * m.ol/m.li — aucun IntersectionObserver propre). Timing : le `delay` du variant REMPLACE le
 * délai de stagger hérité (motion-dom : `{ delay, ...transition }`, spread après) — il est donc
 * ABSOLU : tronçons à 0,15 et 0,55 s (0,45 s chacun, 1,0 s au total) ; les li montent à
 * 0,04 / 0,12 / 0,20 s (0,6 s, ease-out-expo) ⇒ les pastilles sont QUASI en place (> 95 % du
 * trajet à 0,4 s) quand la ligne les atteint. Le dernier jalon ne porte ni route ni tronçon :
 * le rail S'ARRÊTE sur la pastille sapin (terminus), desktop comme mobile.
 * Mobile (< md) : route pointillée PAR li (elle monte avec son étape — accepté, pas de tracé
 * inter-étapes sur mobile), tronçon rempli par le scroll en CSS (.how-rail-fill, globals.css).
 * Jamais scaleX sur la route pointillée (étirait le motif — défaut v1). Rien > 5 s : hors
 * bouton pause. Sous reduced-motion, StaggerGroup ne monte AUCUN LazyMotion → pas de m.* dans
 * cette branche (rendu statique entier).
 *
 * Contrats de jonction (recouvrement ≥ 1 px sous la pastille suivante, jamais un simple contact) :
 *  - desktop : `md:gap-8` de l'<ol> (2 rem) ≡ `md:-right-[calc(2rem+2px)]` ici ;
 *  - mobile  : `top-3.5` de la pastille (14 px) ≡ `-bottom-4` (16 px) de la route et du tronçon.
 * Contrat de défilement (.how-rail-fill, view()) : AUCUN ancêtre avec un `overflow-*` autre que
 * `visible` entre ce span et la racine — voir globals.css.
 * NE PAS ajouter de z-index : l'ordre DOM suffit (voir LandingHowItWorks).
 */

const SEGMENT_DELAY_BASE_S = 0.15;
const SEGMENT_DELAY_STEP_S = 0.4;
const SEGMENT_DURATION_S = 0.45;

const DOT = "absolute left-0 top-3.5 size-[11px] rounded-full md:top-0";
const ROUTE_MOBILE =
  "md:hidden absolute top-[25px] -bottom-4 left-[5px] border-l border-dashed border-sand-300";
const SEGMENT_DESKTOP =
  "hidden md:block absolute top-[5px] left-0 h-px bg-canard-400 md:-right-[calc(2rem+2px)]"; // ≡ md:gap-8 + 2 px (contrat)
const SEGMENT_MOBILE =
  "how-rail-fill md:hidden absolute top-[25px] -bottom-4 left-[5px] w-px bg-canard-400";

export function HowItWorksMilestone({ index, last = false }: { index: number; last?: boolean }) {
  const reduce = useReducedMotionSafe();

  const segmentVariants = {
    hidden: { clipPath: "inset(0 100% 0 0)" },
    show: {
      clipPath: "inset(0 0% 0 0)",
      transition: {
        duration: SEGMENT_DURATION_S,
        // Absolu (remplace le stagger hérité, voir docblock) : 0,15 s puis 0,55 s.
        delay: SEGMENT_DELAY_BASE_S + index * SEGMENT_DELAY_STEP_S,
        ease: EASE_OUT_EXPO,
      },
    },
  };

  return (
    <span aria-hidden="true" className="contents">
      {!last && (
        <>
          {/* Route pointillée MOBILE (la route desktop est dans LandingHowItWorks). */}
          <span className={ROUTE_MOBILE} />
          {/* Tronçon desktop : calé sur le stagger (variants hérités), révélé gauche → droite. */}
          {reduce ? (
            <span className={SEGMENT_DESKTOP} />
          ) : (
            <m.span className={SEGMENT_DESKTOP} variants={segmentVariants} />
          )}
          {/* Tronçon mobile : CSS scroll-driven (progressive enhancement). */}
          <span className={SEGMENT_MOBILE} />
        </>
      )}
      <span className={cn(DOT, last ? "bg-sapin-500" : "bg-canard-400")} />
    </span>
  );
}
