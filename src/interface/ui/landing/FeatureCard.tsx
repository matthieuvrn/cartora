"use client";

import { type ReactElement } from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import {
  CalendarIcon,
  EditorIcon,
  LanguagesIcon,
  PaletteIcon,
  QrCodeIcon,
  WheatIcon,
  type CartoraIconProps,
} from "@/interface/ui/icons";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type FeatureKey = "editor" | "qr" | "allergens" | "bilingual" | "daily" | "branding";
export type FeatureTier = "all" | "starter" | "pro";

// Icône custom par feature (mappée ici : on ne passe pas de composant à travers la frontière RSC).
const CARD_ICONS: Record<FeatureKey, (props: CartoraIconProps) => ReactElement> = {
  editor: EditorIcon,
  qr: QrCodeIcon,
  allergens: WheatIcon,
  bilingual: LanguagesIcon,
  daily: CalendarIcon,
  branding: PaletteIcon,
};

const BADGE_CLASS: Record<Exclude<FeatureTier, "all">, string> = {
  starter: "bg-canard-100 text-canard-700",
  pro: "bg-sapin-100 text-sapin-700",
};

const CARD_CLASS =
  "group relative flex flex-col rounded-xl border border-canard-100 bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-glow";

type FeatureCardProps = {
  featureKey: FeatureKey;
  tier: FeatureTier;
  title: string;
  body: string;
  /** Texte i18n du tier (« PRO », « STARTER et PRO »…) — couleur dérivée de `tier`, pas de ce texte. */
  tierLabel: string;
};

export function FeatureCard({ featureKey, tier, title, body, tierLabel }: FeatureCardProps) {
  const Icon = CARD_ICONS[featureKey];
  const reduce = useReducedMotion();

  const badge =
    tier === "all" ? null : (
      <span
        className={cn(
          "absolute top-4 right-4 rounded-full px-2.5 py-1 text-caption font-medium",
          BADGE_CLASS[tier],
        )}
      >
        {tierLabel}
      </span>
    );

  const text = (
    <>
      <h3 className="mt-4 text-h3 text-canard-900">{title}</h3>
      <p className="mt-2 flex-1 text-body text-sand-700">{body}</p>
    </>
  );

  if (reduce) {
    return (
      <article className={CARD_CLASS}>
        {badge}
        <Icon className="size-7 stroke-[1.75] text-canard-600" />
        {text}
      </article>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <m.article
        className={CARD_CLASS}
        initial="rest"
        animate="rest"
        whileHover="hover"
        variants={{ rest: { y: 0 }, hover: { y: -4 } }}
        transition={SPRING.softSpring}
      >
        {badge}
        <m.span
          className="inline-block"
          variants={{ rest: { scale: 1 }, hover: { scale: 1.08 } }}
          transition={SPRING.bouncySpring}
        >
          <Icon className="size-7 stroke-[1.75] text-canard-600" />
        </m.span>
        {text}
      </m.article>
    </LazyMotion>
  );
}
