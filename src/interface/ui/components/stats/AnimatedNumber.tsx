"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";

// Durée du compteur (ms) + easing ease-out-expo — miroir du token CSS `--ease-out-expo`.
const DURATION_MS = 700;
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Vrai dès qu'un compteur a été hydraté une fois dans cet onglet. Le HTML serveur porte la
 * valeur FINALE (pas de mismatch, lisible sans JS) ; on n'anime que les montages ULTÉRIEURS
 * (navigation client) — animer au premier rendu ferait « sauter » la valeur déjà peinte à 0.
 */
let hydratedOnce = false;

type Anim = { target: number; shown: number };

/**
 * Compteur KPI : monte de 0 à `value` en ~700 ms (une fois, sobre), formaté selon la locale de
 * la chrome. Sous `prefers-reduced-motion` la valeur est rendue telle quelle. Aucun setState
 * synchrone dans l'effet (règle `react-hooks/set-state-in-effect`) : seuls les ticks rAF écrivent.
 */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotionSafe();
  const locale = useLocale();
  const animateOnMount = useRef(hydratedOnce);
  const [anim, setAnim] = useState<Anim | null>(null);

  useEffect(() => {
    hydratedOnce = true;
  }, []);

  useEffect(() => {
    if (reduce || !animateOnMount.current || value === 0) return;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / DURATION_MS);
      setAnim({ target: value, shown: Math.round(value * easeOutExpo(progress)) });
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);

  const shown = anim && anim.target === value ? anim.shown : value;
  return <span className={className}>{new Intl.NumberFormat(locale).format(shown)}</span>;
}
