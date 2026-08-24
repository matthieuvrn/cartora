"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LazyMotion, domAnimation, m } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { trackLandingEvent } from "@/interface/ui/landing/trackLandingEvent";
import { EASE_OUT_EXPO } from "@/lib/motion";

/**
 * CTA collant en bas d'écran, mobile uniquement (`md:hidden`). Visible entre le hero et la
 * FinalCta — un CTA signup à portée de pouce pendant le scroll (le CTA header reste en HAUT,
 * hors zone du pouce). Visibilité pilotée par IntersectionObserver (pas de maths scrollY
 * fragile) : affiché quand le hero est sorti du viewport ET la FinalCta pas encore atteinte.
 *
 * Décision actée dans docs/landing-plan.md §8 (override de l'ancien refus). Event :
 * `cta_sticky_signup`. Slide-up désactivé si `prefers-reduced-motion`.
 */
export function StickyMobileCTA() {
  const t = useTranslations("Landing.header");
  const locale = useLocale();
  const reduce = useReducedMotionSafe();
  const [heroOut, setHeroOut] = useState(false);
  const [finalIn, setFinalIn] = useState(false);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const observe = (id: string, cb: (intersecting: boolean) => void) => {
      const el = document.getElementById(id);
      if (!el) return;
      const io = new IntersectionObserver(([entry]) => cb(entry.isIntersecting), { threshold: 0 });
      io.observe(el);
      observers.push(io);
    };
    observe("hero-heading", (intersecting) => setHeroOut(!intersecting));
    // FinalCta visible OU déjà dépassée (footer) → pilule masquée : le CTA de clôture a été
    // présenté, la barre ne ferait que recouvrir le footer. `boundingClientRect.top < 0`
    // distingue « pas encore atteinte » (dessous) de « dépassée » (dessus).
    const finalEl = document.getElementById("final-cta");
    if (finalEl) {
      const io = new IntersectionObserver(
        ([entry]) => setFinalIn(entry.isIntersecting || entry.boundingClientRect.top < 0),
        { threshold: 0 },
      );
      io.observe(finalEl);
      observers.push(io);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const visible = heroOut && !finalIn;

  const handleClick = () => {
    trackLandingEvent({ event: "cta_sticky_signup", locale });
  };

  const button = (
    <Link
      href="/signup?src=sticky"
      onClick={handleClick}
      tabIndex={visible ? undefined : -1}
      className="flex h-13 w-full items-center justify-center rounded-full border border-white/10 bg-nuit-900/95 text-base font-medium text-sand-50 shadow-[var(--shadow-pill-dark)] backdrop-blur-md transition-transform active:scale-[0.98]"
    >
      {t("signupCta")}
    </Link>
  );

  // Pilule flottante détachée (plus de barre bord-à-bord) : nuit + hairline + halo,
  // cohérente avec les CTA des scènes nuit. safe-area : max() garde 1rem de marge mini.
  const wrapperBase =
    "fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 md:hidden";

  if (reduce) {
    return (
      <div className={`${wrapperBase} ${visible ? "" : "hidden"}`} aria-hidden={!visible}>
        {button}
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className={wrapperBase}
        initial={false}
        // "160%" : pilule + bottom-4 + ombre portée — la sortie doit emmener le halo avec elle.
        animate={{ y: visible ? 0 : "160%" }}
        transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
        aria-hidden={!visible}
      >
        {button}
      </m.div>
    </LazyMotion>
  );
}
