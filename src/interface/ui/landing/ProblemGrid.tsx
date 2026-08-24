"use client";

import { LazyMotion, domAnimation, m } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { AlertTriangle, CloudRain, FileText, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { REVEAL_CONTAINER, REVEAL_ITEM } from "@/lib/motion";
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

const GRID_CLASS = "grid sm:grid-cols-2";

function titleIdFor(key: ProblemPainKey) {
  return `problem-${key}-title`;
}

/* Traitement éditorial (DA Nuit de service) : pas de cards flottantes — des cellules séparées
   par des hairlines internes uniquement. Aucun hover : les cellules ne sont pas cliquables
   (loi anti fausse-affordance). */
function cellClass(index: number) {
  return cn(
    "border-sand-200 py-10",
    // Hairline horizontale : rangées 2+ en mobile (1 colonne), rangée 2 seulement dès sm.
    index > 0 && "border-t",
    index === 1 && "sm:border-t-0",
    // Hairline verticale : colonne 2 dès sm.
    index % 2 === 1 && "sm:border-l sm:pl-8",
    index % 2 === 0 && "sm:pr-8",
  );
}

function CellContent({ item, index }: { item: ProblemItem; index: number }) {
  const Icon = ICONS[item.key];
  return (
    <>
      {/* Icône en pastille (containers unifiés §5) + numéro éditorial en contrepoint mono. */}
      <div className="flex items-center justify-between">
        <span className="inline-flex size-10 items-center justify-center rounded-xl border border-sand-200 bg-sand-50">
          <Icon className="size-5 stroke-[1.5] text-canard-700" aria-hidden="true" />
        </span>
        <span className="font-mono text-micro tracking-wider text-sand-500" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <h3 id={titleIdFor(item.key)} className="mt-5 text-h3 text-balance text-canard-950">
        {item.title}
      </h3>
      <p className="mt-2 text-body text-sand-700">{item.body}</p>
    </>
  );
}

export function ProblemGrid({ items }: { items: ProblemItem[] }) {
  const reduce = useReducedMotionSafe();

  if (reduce) {
    return (
      <div className={GRID_CLASS}>
        {items.map((it, index) => (
          <article key={it.key} className={cellClass(index)} aria-labelledby={titleIdFor(it.key)}>
            <CellContent item={it} index={index} />
          </article>
        ))}
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      {/* Entrée en cascade (REVEAL_*) orchestrée par la grille — seul mouvement de la
          section : pas d'animation hover sur du non-cliquable. */}
      <m.div
        className={GRID_CLASS}
        variants={REVEAL_CONTAINER}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      >
        {items.map((it, index) => (
          <m.article
            key={it.key}
            className={cellClass(index)}
            variants={REVEAL_ITEM}
            aria-labelledby={titleIdFor(it.key)}
          >
            <CellContent item={it} index={index} />
          </m.article>
        ))}
      </m.div>
    </LazyMotion>
  );
}
