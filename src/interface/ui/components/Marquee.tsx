"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type MarqueeProps = {
  children: ReactNode;
  className?: string;
  /** Durée d'un cycle complet (ms). Plus c'est haut, plus ça défile lentement. */
  durationMs?: number;
};

/**
 * Marquee horizontale infinie, 100% CSS (`@keyframes marquee` dans globals.css).
 * Le track contient deux copies identiques des enfants ; l'animation translate de -50%,
 * soit exactement une copie → boucle sans couture. Pause au survol. Le mouvement est
 * neutralisé par `motion-reduce` ET par le `@media (prefers-reduced-motion)` global.
 * La 2ᵉ copie est `aria-hidden` pour ne pas faire lire le contenu deux fois.
 */
export function Marquee({ children, className, durationMs = 30000 }: MarqueeProps) {
  return (
    <div className={cn("group flex overflow-hidden", className)}>
      <div
        className="flex shrink-0 animate-marquee items-center group-hover:[animation-play-state:paused] motion-reduce:animate-none"
        style={{ animationDuration: `${durationMs}ms` }}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
