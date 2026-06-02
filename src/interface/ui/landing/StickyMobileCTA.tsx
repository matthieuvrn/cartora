"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { trackLandingEvent } from "@/interface/ui/landing/trackLandingEvent";

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
  const reduce = useReducedMotion();
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
    observe("final-cta", setFinalIn);
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const visible = heroOut && !finalIn;

  const handleClick = () => {
    trackLandingEvent({ event: "cta_sticky_signup", locale });
  };

  const button = (
    <Link
      href="/signup"
      onClick={handleClick}
      tabIndex={visible ? undefined : -1}
      className="flex h-14 w-full items-center justify-center text-base font-medium text-sand-50 active:bg-canard-700"
    >
      {t("signupCta")}
    </Link>
  );

  const wrapperBase =
    "fixed inset-x-0 bottom-0 z-30 bg-canard-600 pb-[env(safe-area-inset-bottom)] shadow-xl md:hidden";

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
        animate={{ y: visible ? 0 : 88 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden={!visible}
      >
        {button}
      </m.div>
    </LazyMotion>
  );
}
