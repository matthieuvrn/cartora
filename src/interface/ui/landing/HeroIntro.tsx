"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Check, Gift, ShieldCheck } from "lucide-react";
import { LazyMotion, domAnimation, m } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";
import { EASE_OUT_EXPO, REVEAL_ITEM } from "@/lib/motion";

// Icônes des 3 segments du micro-trust, dans l'ordre de la copy figée
// (« Sans carte bancaire · Gratuit pour commencer · Résiliable à tout moment »). Le 2e segment
// disait « Configuration en 10 minutes » (Clock) avant le pivot copy de 2026-08 — l'icône
// horloge était restée (passe landing 2026-09-06). Check (pas X) : la zone de réassurance ne
// doit porter aucun glyphe négatif.
const MICRO_TRUST_ICONS = [Check, Gift, ShieldCheck] as const;

// Cascade locale (ne pas éditer REVEAL_CONTAINER : partagé avec StaggerReveal + dashboard).
// delayChildren 0.45 = après le départ du brush (0.35 s, .hero-underline). Le stagger de 0.2 s
// laisse le sous-titre mot à mot (≈ 0.6 s d'étalement) prendre de l'avance sans retarder le CTA
// au-delà de 0.65 s. Timeline : h1 0 s (LCP) → brush 0,35 s → sous-titre 0,45 s → CTA 0,65 s
// → micro-trust 0,85 s (le téléphone entre pendant le brush, cf. HeroPhone).
const HERO_CASCADE = {
  hidden: {},
  show: { transition: { staggerChildren: 0.2, delayChildren: 0.45 } },
} as const;

// Découpage : espace NON suivie d'une ponctuation haute (« téléphone : », « jour — » restent
// soudés → jamais un « : » orphelin en début de ligne). Déterministe serveur/client
// (t("subtitle") est une chaîne plate). Jetons vérifiés sur la copy actuelle : FR 22, EN 21
// (« phone: » est déjà soudé en EN). Le regex ne dépend pas de la copy : « QR code » est UN
// jeton parce que `Landing.hero.subtitle` (fr + en) porte une espace insécable U+00A0 entre
// les deux mots (la coupe « QR / code » tombait à 390 px en FR — recette 2026-09-12) ; la
// soudure vit dans les fichiers de messages, jamais ici (U+0020 seul est découpé).
const WORD_SPLIT = / (?![:;!?—–])/;

// Sous-titre mot à mot (seul texte de la landing autorisé au blur, da-rules § 04) :
// 28 ms d'écart par mot, chaque mot 0,5 s. Jamais sur le h1. `transitionEnd` rend le filter
// à `none` comme REVEAL_HEADING (motion.ts) : un `blur(0px)` résiduel garderait 23 spans sur
// des couches composées (anticrénelage en niveaux de gris).
const WORDS = { hidden: {}, show: { transition: { staggerChildren: 0.028 } } } as const;
const WORD = {
  hidden: { opacity: 0, y: 8, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: EASE_OUT_EXPO },
    transitionEnd: { filter: "none" },
  },
} as const;

// Le h1 (LCP) reste rendu hors de ce composant, instantané. Ici on fait apparaître
// le reste du bloc texte en cascade après lui : sous-titre (mot à mot) → CTA → micro-trust
// (presets partagés REVEAL_* — src/lib/motion.ts). Sur la scène nuit, le CTA primaire
// est automatiquement une pilule porcelaine (remap .section-nuit, cf. globals.css).

export function HeroIntro() {
  const t = useTranslations("Landing.hero");
  const reduce = useReducedMotionSafe();

  const microTrustItems = t("microTrust")
    .split(" · ")
    .map((label) => label.trim())
    .filter(Boolean);

  const subtitleText = t("subtitle");
  const words = subtitleText.split(WORD_SPLIT);

  // Branche PRM : <p> plat, lecture continue.
  const subtitleStatic = (
    <p className="mt-7 max-w-[36rem] text-lead text-sand-200/85">{subtitleText}</p>
  );

  // Nœud UNIQUE partagé par les deux branches. `id="hero-cta"` = contrat StickyMobileCTA
  // (la pilule collante apparaît à la sortie de cette rangée) — ne jamais le retirer.
  const ctas = (
    <div id="hero-cta" className="mt-9 flex flex-wrap items-center gap-4">
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
        {subtitleStatic}
        {ctas}
        {trust}
      </>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div variants={HERO_CASCADE} initial="hidden" animate="show">
        {/* Lecture AT : une seule phrase continue (sr-only, position absolute → hors flux et
            hors cascade motion). Le <p> animé est masqué aux AT : WebKit (VoiceOver) et
            Chromium exposent chaque inline-block comme un objet séparé (22 arrêts VO+→).
            Pas d'aria-label sur le <p> : nommage interdit sur le rôle paragraph.
            Les espaces sont de vrais nœuds texte entre les inline-block : le retour à la
            ligne reste naturel dans max-w-[36rem] ; whitespace-nowrap garde « téléphone : »
            sur une ligne. */}
        <p className="sr-only">{subtitleText}</p>
        <m.p
          className="mt-7 max-w-[36rem] text-lead text-sand-200/85"
          variants={WORDS}
          aria-hidden="true"
        >
          {words.map((word, i) => (
            <Fragment key={i}>
              <m.span className="inline-block whitespace-nowrap" variants={WORD}>
                {word}
              </m.span>
              {i < words.length - 1 ? " " : null}
            </Fragment>
          ))}
        </m.p>
        <m.div variants={REVEAL_ITEM}>{ctas}</m.div>
        <m.div variants={REVEAL_ITEM}>{trust}</m.div>
      </m.div>
    </LazyMotion>
  );
}
