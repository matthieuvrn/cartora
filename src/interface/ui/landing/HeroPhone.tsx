"use client";

import { type StaticImageData } from "next/image";
import { useRef } from "react";
import {
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { PhoneMockup } from "@/interface/ui/components/PhoneMockup";
import { cn } from "@/lib/utils";

type HeroPhoneProps = {
  src: StaticImageData;
  alt: string;
  priority?: boolean;
  /** Inclinaison 3D statique (propagée à PhoneMockup). */
  tilt?: number;
  /** Largeur du téléphone (ex. "w-[280px] md:w-[320px]"). */
  className?: string;
};

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Habillage motion du hero autour de `PhoneMockup` (gardé pur/server) :
 *  - halo canard flou derrière le téléphone (ancre la colonne, remplit le vide),
 *  - entrée fade-up légère au chargement (delay → cascade après le texte),
 *  - float idle ±6px et parallaxe pilotée au scroll (mirror de `BrowserMockup`),
 *  - chaque transform sur sa propre couche pour ne pas se disputer la valeur `y`.
 * Sous `prefers-reduced-motion` : halo + téléphone statiques, aucun mouvement.
 * Cf. docs/ui-refonte-2026.md §8.
 */
export function HeroPhone({ src, alt, priority = false, tilt = 0, className }: HeroPhoneProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [24, -24]);

  const halo = (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 m-auto h-3/4 w-3/4 rounded-full bg-canard-400/25 blur-3xl"
    />
  );

  const phone = (
    <PhoneMockup src={src} alt={alt} priority={priority} tilt={tilt} className="w-full" />
  );

  if (reduce) {
    return (
      <div ref={ref} className={cn("relative isolate", className)}>
        {halo}
        {phone}
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
            {/* Couche float idle (boucle infinie subtile) */}
            <m.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              {phone}
            </m.div>
          </m.div>
        </m.div>
      </LazyMotion>
    </div>
  );
}
