"use client";

import { useTranslations } from "next-intl";
import { Clock, ShieldCheck, X } from "lucide-react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";

// Icônes des 3 segments du micro-trust, dans l'ordre de la copy figée
// (« Sans carte bancaire · Configuration en 10 minutes · Résiliable à tout moment »).
const MICRO_TRUST_ICONS = [X, Clock, ShieldCheck] as const;

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Le h1 (LCP) reste rendu hors de ce composant, instantané. Ici on fait apparaître
// le reste du bloc texte en cascade après lui : sous-titre → CTA → micro-trust.
const CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
} as const;

const ITEM = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT_EXPO } },
} as const;

export function HeroIntro() {
  const t = useTranslations("Landing.hero");
  const reduce = useReducedMotion();

  const microTrustItems = t("microTrust")
    .split(" · ")
    .map((label) => label.trim())
    .filter(Boolean);

  const subtitle = <p className="mt-7 max-w-[34rem] text-body-lg text-sand-700">{t("subtitle")}</p>;

  const ctas = (
    <div className="mt-9 flex flex-wrap items-center gap-4">
      <TrackedCtaButton
        event="cta_hero_signup"
        href="/signup"
        variant="primary"
        size="lg"
        className="h-12 px-7 shadow-glow hover:shadow-xl"
      >
        {t("ctaPrimary")}
      </TrackedCtaButton>
      <TrackedCtaButton
        event="cta_hero_demo"
        href="/m/demo-cartora"
        external
        variant="ghost"
        size="lg"
        className="group"
      >
        {t("ctaSecondary")}
        <span
          aria-hidden="true"
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        >
          →
        </span>
      </TrackedCtaButton>
    </div>
  );

  const trust = (
    <ul className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-sand-600">
      {microTrustItems.map((label, i) => {
        const Icon = MICRO_TRUST_ICONS[i] ?? ShieldCheck;
        return (
          <li key={label} className="flex items-center gap-1.5">
            <Icon className="size-3.5 stroke-[1.75] text-sapin-600" aria-hidden="true" />
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
      <m.div variants={CONTAINER} initial="hidden" animate="show">
        <m.div variants={ITEM}>{subtitle}</m.div>
        <m.div variants={ITEM}>{ctas}</m.div>
        <m.div variants={ITEM}>{trust}</m.div>
      </m.div>
    </LazyMotion>
  );
}
