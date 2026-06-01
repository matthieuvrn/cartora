"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { AlertTriangle, CloudRain, FileText, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SPRING } from "@/lib/motion";

export type ProblemPainKey = "ardoise" | "pdf" | "wix" | "allergens";

export type ProblemItem = {
  key: ProblemPainKey;
  title: string;
  body: string;
};

const ICONS: Record<ProblemPainKey, LucideIcon> = {
  ardoise: CloudRain,
  pdf: FileText,
  wix: Wrench,
  allergens: AlertTriangle,
};

const GRID_CLASS = "grid gap-5 md:grid-cols-2";
// Même registre que les cards Features : icône nue en canard, Fraunces, hover lift + glow.
const CARD_CLASS =
  "group relative flex flex-col rounded-xl border border-canard-100 bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-glow";
const ICON_CLASS = "size-7 stroke-[1.75] text-canard-600";

function Title({ children }: { children: string }) {
  return <h3 className="mt-4 text-h3 text-balance text-canard-900">{children}</h3>;
}

function Body({ children }: { children: string }) {
  return <p className="mt-2 text-body text-sand-700">{children}</p>;
}

export function ProblemGrid({ items }: { items: ProblemItem[] }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className={GRID_CLASS}>
        {items.map((it) => {
          const Icon = ICONS[it.key];
          return (
            <article key={it.key} className={CARD_CLASS} aria-label={it.title}>
              <Icon className={ICON_CLASS} aria-hidden="true" />
              <Title>{it.title}</Title>
              <Body>{it.body}</Body>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <div className={GRID_CLASS}>
        {items.map((it) => {
          const Icon = ICONS[it.key];
          return (
            <m.article
              key={it.key}
              className={CARD_CLASS}
              initial="rest"
              animate="rest"
              whileHover="hover"
              variants={{ rest: { y: 0 }, hover: { y: -4 } }}
              transition={SPRING.softSpring}
              aria-label={it.title}
            >
              <m.span
                className="inline-block"
                variants={{ rest: { scale: 1 }, hover: { scale: 1.08 } }}
                transition={SPRING.bouncySpring}
              >
                <Icon className={ICON_CLASS} aria-hidden="true" />
              </m.span>
              <Title>{it.title}</Title>
              <Body>{it.body}</Body>
            </m.article>
          );
        })}
      </div>
    </LazyMotion>
  );
}
