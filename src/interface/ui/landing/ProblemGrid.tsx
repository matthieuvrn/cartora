"use client";

import { LazyMotion, domAnimation, m } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { AlertTriangle, CloudRain, FileText, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { REVEAL_CONTAINER, REVEAL_ITEM, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

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

function Title({ id, children }: { id: string; children: string }) {
  return (
    <h3 id={id} className="mt-4 text-h3 text-balance text-canard-900">
      {children}
    </h3>
  );
}

function Body({ children }: { children: string }) {
  return <p className="mt-2 text-body text-sand-700">{children}</p>;
}

export function ProblemGrid({ items }: { items: ProblemItem[] }) {
  const reduce = useReducedMotionSafe();

  if (reduce) {
    return (
      <div className={GRID_CLASS}>
        {items.map((it) => {
          const Icon = ICONS[it.key];
          const titleId = `problem-${it.key}-title`;
          return (
            <article key={it.key} className={CARD_CLASS} aria-labelledby={titleId}>
              <Icon className={ICON_CLASS} aria-hidden="true" />
              <Title id={titleId}>{it.title}</Title>
              <Body>{it.body}</Body>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      {/* Entrée en cascade (REVEAL_*) orchestrée par la grille ; le hover lift garde ses
          propres variants sur l'article (deux jeux de variants = deux éléments). */}
      <m.div
        className={GRID_CLASS}
        variants={REVEAL_CONTAINER}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      >
        {items.map((it) => {
          const Icon = ICONS[it.key];
          const titleId = `problem-${it.key}-title`;
          return (
            <m.div key={it.key} variants={REVEAL_ITEM}>
              <m.article
                className={cn(CARD_CLASS, "h-full")}
                initial="rest"
                animate="rest"
                whileHover="hover"
                variants={{ rest: { y: 0 }, hover: { y: -4 } }}
                transition={SPRING.softSpring}
                aria-labelledby={titleId}
              >
                <m.span
                  className="inline-block"
                  variants={{ rest: { scale: 1 }, hover: { scale: 1.08 } }}
                  transition={SPRING.bouncySpring}
                >
                  <Icon className={ICON_CLASS} aria-hidden="true" />
                </m.span>
                <Title id={titleId}>{it.title}</Title>
                <Body>{it.body}</Body>
              </m.article>
            </m.div>
          );
        })}
      </m.div>
    </LazyMotion>
  );
}
