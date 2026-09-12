"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LazyMotion, domAnimation, m } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";
import { useLandingChrome } from "@/interface/ui/landing/landingChromeStore";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { COOKIE_BANNER_OFFSET } from "@/interface/ui/components/consent/cookieBannerOffset";
import { cn } from "@/lib/utils";

/**
 * CTA collant en bas d'écran, mobile uniquement (`md:hidden`) — un CTA signup à portée de pouce
 * pendant le scroll (le CTA header reste en HAUT, hors zone du pouce).
 *
 * Visibilité (IntersectionObserver, pas de maths scrollY fragile) : la rangée CTA du hero
 * (`#hero-cta`, contrat posé par `HeroIntro`) est SORTIE PAR LE HAUT, hors `#pricing` (ses trois
 * CTA sont la décision, la pilule les recouvrirait), avant `#final-cta` (visible ou dépassée →
 * masquée : le CTA de clôture a été présenté), carte menu fermée (`menuOpen` du store : un seul
 * CTA primaire flottant par viewport). Sans `#hero-cta` dans le DOM, la pilule n'apparaît jamais.
 *
 * Peau scene-aware (passe 2026-09) : `section-nuit` sur le wrapper selon
 * `useLandingChrome().bottom` (bande basse 96 px) — porcelaine sur les scènes nuit, canard sur
 * les sections claires ; le remap `--primary` / `--cta-shadow` / `--ring` fait tout. Le wrapper
 * ne porte AUCUN fond (sinon une dalle nuit derrière la pilule). `TrackedCtaButton` = unique
 * source de pilule (tracking `cta_sticky_signup` inclus) ; ne jamais surcharger ses ombres.
 * Masquage par `inert` (hors tabulation ET hors arbre a11y en un attribut, React 19).
 *
 * Décision actée dans docs/landing-plan.md §8 (override de l'ancien refus). Slide-up désactivé
 * si `prefers-reduced-motion` (`useReducedMotionSafe`, hydration-safe).
 */
export function StickyMobileCTA() {
  const t = useTranslations("Landing.header");
  const reduce = useReducedMotionSafe();
  const { bottom, menuOpen } = useLandingChrome();
  const [heroCtaPassed, setHeroCtaPassed] = useState(false);
  const [pricingIn, setPricingIn] = useState(false);
  const [finalIn, setFinalIn] = useState(false);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const watch = (id: string, cb: (entry: IntersectionObserverEntry) => void) => {
      const el = document.getElementById(id);
      if (!el) return;
      const io = new IntersectionObserver(([entry]) => cb(entry), { threshold: 0 });
      io.observe(el);
      observers.push(io);
    };
    // Apparaît quand la rangée CTA du hero est SORTIE PAR LE HAUT (pas simplement hors champ).
    watch("hero-cta", (e) => setHeroCtaPassed(!e.isIntersecting && e.boundingClientRect.top < 0));
    // Masquée tant que le pricing est visible.
    watch("pricing", (e) => setPricingIn(e.isIntersecting));
    // FinalCta visible OU déjà dépassée (footer) → masquée. `boundingClientRect.top < 0`
    // distingue « pas encore atteinte » (dessous) de « dépassée » (dessus).
    watch("final-cta", (e) => setFinalIn(e.isIntersecting || e.boundingClientRect.top < 0));
    return () => observers.forEach((o) => o.disconnect());
    // `reduce` : la bascule PRM post-hydratation (false → true) remplace `#hero-cta` /
    // `#pricing` / `#final-cta` (les wrappers motion remontent leurs sous-arbres) — ré-observer.
  }, [reduce]);

  const visible = heroCtaPassed && !pricingIn && !finalIn && !menuOpen;

  // safe-area : max() garde 1rem de marge mini ; + hauteur de la bannière cookies tant qu'elle
  // est visible (z-30 sous son z-50 : sans ce décalage, la pilule était entièrement recouverte
  // pendant le consentement pending).
  const wrapperClass = cn("fixed inset-x-4 z-30 md:hidden", bottom === "nuit" && "section-nuit");
  const wrapperStyle = {
    bottom: `calc(max(1rem, env(safe-area-inset-bottom)) + ${COOKIE_BANNER_OFFSET})`,
  };

  // size="xl" = h-13 (52 px), même hauteur que l'ancienne pilule ; w-full garde la pleine largeur.
  const button = (
    <TrackedCtaButton
      event="cta_sticky_signup"
      href="/signup?src=sticky"
      size="xl"
      className="w-full whitespace-nowrap"
    >
      {t("signupCta")}
    </TrackedCtaButton>
  );

  if (reduce) {
    return (
      <div className={cn(wrapperClass, !visible && "hidden")} style={wrapperStyle} inert={!visible}>
        {button}
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className={wrapperClass}
        style={wrapperStyle}
        initial={false}
        // "160%" : pilule + bottom-4 + ombre portée — la sortie doit emmener le halo avec elle.
        // Bannière visible : la pilule sort derrière elle (z-30 < z-50), même effet.
        animate={{ y: visible ? 0 : "160%" }}
        transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
        inert={!visible}
      >
        {button}
      </m.div>
    </LazyMotion>
  );
}
