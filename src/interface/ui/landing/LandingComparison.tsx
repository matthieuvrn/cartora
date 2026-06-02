"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck, FileText, Globe, type LucideIcon } from "lucide-react";
import { LazyMotion, domAnimation, m, useReducedMotion, type Variants } from "motion/react";
import { LandingSection } from "@/interface/ui/landing/LandingSection";

type CardKey = "paper" | "website" | "other";

/**
 * Contenu figé (3 cas honnêtes : papier / site existant / autres menus digitaux). Pas de tableau ✓/✕
 * menteur, et pas de ligne « gagnante » mise en couleur (la copy dit elle-même que d'autres outils
 * font bien leur travail) → les 3 lignes sont strictement identiques. Panneau éditorial à filets
 * (registre Stripe Press / Mercury), animé : reveal en cascade au scroll + survol (halo + icône),
 * décor de halos canard/sapin derrière le panneau. Tout est désactivé sous `prefers-reduced-motion`.
 */
const ROWS: ReadonlyArray<{ key: CardKey; Icon: LucideIcon }> = [
  { key: "paper", Icon: FileText },
  { key: "website", Icon: Globe },
  { key: "other", Icon: BadgeCheck },
] as const;

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const LIST_VARIANTS: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } },
};
const ROW_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT_EXPO } },
};

const LIST_CLASS =
  "mx-auto max-w-4xl divide-y divide-canard-100 overflow-hidden rounded-2xl border border-canard-100 bg-card shadow-md";
const ROW_CLASS =
  "group grid gap-x-8 gap-y-3 p-6 transition-colors duration-200 hover:bg-canard-50/50 md:grid-cols-3 md:p-8";

/** Halos décoratifs derrière le panneau (CSS pur, clipés par le section overflow-hidden). */
function Decor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute top-10 -left-16 size-72 rounded-full bg-canard-500/15 blur-3xl" />
      <div className="absolute -right-16 bottom-10 size-80 rounded-full bg-sapin-500/12 blur-3xl" />
    </div>
  );
}

function RowBody({
  Icon,
  label,
  body,
  titleId,
}: {
  Icon: LucideIcon;
  label: string;
  body: string;
  titleId: string;
}) {
  return (
    <>
      <div className="flex items-start gap-3 md:flex-col md:gap-4">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-canard-50 text-canard-600 transition-transform duration-200 group-hover:scale-110">
          <Icon className="size-5 stroke-[1.75]" aria-hidden="true" />
        </span>
        <h3 id={titleId} className="text-h3 text-canard-900">
          {label}
        </h3>
      </div>
      <p className="text-body text-sand-700 md:col-span-2">{body}</p>
    </>
  );
}

export function LandingComparison() {
  const t = useTranslations("Landing.comparison");
  const reduce = useReducedMotion();

  const rows = ROWS.map(({ key, Icon }) => ({
    key,
    Icon,
    titleId: `comparison-${key}-title`,
    label: t(`cards.${key}.label`),
    body: t(`cards.${key}.body`),
  }));

  const header = (
    <header className="mx-auto mb-12 max-w-2xl text-center">
      <h2 className="text-h1 md:text-h2">{t("title")}</h2>
      <p className="mt-3 text-body-lg text-sand-700">{t("subtitle")}</p>
    </header>
  );

  if (reduce) {
    return (
      <LandingSection
        id="comparison"
        className="relative isolate overflow-hidden"
        innerClassName="py-16 md:py-24"
      >
        <Decor />
        {header}
        <ul className={LIST_CLASS}>
          {rows.map(({ key, Icon, titleId, label, body }) => (
            <li key={key} aria-labelledby={titleId} className={ROW_CLASS}>
              <RowBody Icon={Icon} label={label} body={body} titleId={titleId} />
            </li>
          ))}
        </ul>
      </LandingSection>
    );
  }

  return (
    <LandingSection
      id="comparison"
      className="relative isolate overflow-hidden"
      innerClassName="py-16 md:py-24"
    >
      <Decor />
      <LazyMotion features={domAnimation} strict>
        <m.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        >
          {header}
        </m.div>
        <m.ul
          className={LIST_CLASS}
          variants={LIST_VARIANTS}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "0px 0px -15% 0px" }}
        >
          {rows.map(({ key, Icon, titleId, label, body }) => (
            <m.li key={key} aria-labelledby={titleId} className={ROW_CLASS} variants={ROW_VARIANTS}>
              <RowBody Icon={Icon} label={label} body={body} titleId={titleId} />
            </m.li>
          ))}
        </m.ul>
      </LazyMotion>
    </LandingSection>
  );
}
