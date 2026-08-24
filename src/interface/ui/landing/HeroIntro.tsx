"use client";

import { useTranslations } from "next-intl";
import { Check, Clock, ShieldCheck } from "lucide-react";
import { LazyMotion, domAnimation, m } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";
import { REVEAL_CONTAINER, REVEAL_ITEM } from "@/lib/motion";

// Icônes des 3 segments du micro-trust, dans l'ordre de la copy figée
// (« Sans carte bancaire · Configuration en 10 minutes · Résiliable à tout moment »).
// Check (pas X) : la zone de réassurance ne doit porter aucun glyphe négatif.
const MICRO_TRUST_ICONS = [Check, Clock, ShieldCheck] as const;

// Le h1 (LCP) reste rendu hors de ce composant, instantané. Ici on fait apparaître
// le reste du bloc texte en cascade après lui : sous-titre → CTA → micro-trust
// (presets partagés REVEAL_* — src/lib/motion.ts). Sur la scène nuit, le CTA primaire
// est automatiquement une pilule porcelaine (remap .section-nuit, cf. globals.css).

export function HeroIntro() {
  const t = useTranslations("Landing.hero");
  const reduce = useReducedMotionSafe();

  const microTrustItems = t("microTrust")
    .split(" · ")
    .map((label) => label.trim())
    .filter(Boolean);

  const subtitle = <p className="mt-7 max-w-[36rem] text-lead text-sand-200/85">{t("subtitle")}</p>;

  const ctas = (
    <div className="mt-9 flex flex-wrap items-center gap-4">
      <TrackedCtaButton event="cta_hero_signup" href="/signup?src=hero" size="xl" arrow>
        {t("ctaPrimary")}
      </TrackedCtaButton>
      <TrackedCtaButton
        event="cta_hero_demo"
        href="/m/demo-cartora"
        external
        variant="outline"
        size="xl"
      >
        {t("ctaSecondary")}
      </TrackedCtaButton>
    </div>
  );

  const trust = (
    <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2.5 font-mono text-caption tracking-wide text-sand-300">
      {microTrustItems.map((label, i) => {
        const Icon = MICRO_TRUST_ICONS[i] ?? ShieldCheck;
        return (
          <li key={label} className="flex items-center gap-2">
            <Icon className="size-3.5 stroke-[1.75] text-sapin-300" aria-hidden="true" />
            {label}
          </li>
        );
      })}
    </ul>
  );

  if (reduce) {
    return (
      <>
        {subtitle}
        {ctas}
        {trust}
      </>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div variants={REVEAL_CONTAINER} initial="hidden" animate="show">
        <m.div variants={REVEAL_ITEM}>{subtitle}</m.div>
        <m.div variants={REVEAL_ITEM}>{ctas}</m.div>
        <m.div variants={REVEAL_ITEM}>{trust}</m.div>
      </m.div>
    </LazyMotion>
  );
}
