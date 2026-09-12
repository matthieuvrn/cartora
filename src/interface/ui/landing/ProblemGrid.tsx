"use client";

import { useState } from "react";
import { LazyMotion, domAnimation, m } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { REVEAL_CONTAINER, REVEAL_ITEM } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type ProblemPainKey = "ardoise" | "pdf" | "wix" | "allergens";

export type ProblemArtefact =
  | { kind: "chalk"; label: string; dish: string; price: string }
  | { kind: "strike"; dish: string; price: string };

export type ProblemItem = {
  key: ProblemPainKey;
  title: string;
  body: string;
  /** Chiffre-clé de la ligne de conduite « douleur …… chiffre » — décoratif (doublon du body). */
  figure: string;
  /** Illustration CSS (données du seed uniquement) — rangée 1 (ardoise, pdf). */
  artefact?: ProblemArtefact;
};

const GRID_CLASS = "grid md:grid-cols-2";
const VIEWPORT = { once: true, margin: "0px 0px -10% 0px" } as const;
// Numéral filigrane : 03 et 04 seulement (coût agence, allergènes = les deux douleurs décisives).
const WATERMARK_INDEXES = new Set([2, 3]);

function titleIdFor(key: ProblemPainKey) {
  return `problem-${key}-title`;
}

/* Grammaire « carte de restaurant » (DA Nuit de service) : cellules séparées par des hairlines,
   titre + points de conduite + chiffre-clé mono. Aucun hover : les cellules ne sont pas
   cliquables (loi anti fausse-affordance). La verticale de la grille est tracée par le parent
   (LandingProblem, gouttière à 50 %) ; ici seules les horizontales, avec leurs queues fondues. */
function cellClass(index: number) {
  return cn(
    "relative border-sand-200 py-10",
    index > 0 && "border-t",
    index === 1 && "md:border-t-0",
    index % 2 === 1 && "md:pl-8",
    index % 2 === 0 && "md:pr-8",
  );
}

function HairlineTail({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -top-px hidden h-px w-6 md:block xl:w-12",
        side === "left"
          ? "right-full bg-linear-to-l from-sand-200 to-transparent"
          : "left-full bg-linear-to-r from-sand-200 to-transparent",
      )}
    />
  );
}

/* Artefacts = illustrations aria-hidden, données du seed uniquement (LandingProblem). La ligne
   biffée l'est EN ENTIER (plat + points + prix) : un prix barré suivi d'un prix plus bas se lit
   comme une promotion (précédent LandingFeatures) — ici c'est un plat qui n'est plus servi. */
function Artefact({ artefact }: { artefact: ProblemArtefact }) {
  if (artefact.kind === "chalk") {
    return (
      <p aria-hidden="true" className="artefact-chalk mt-4 font-mono text-caption text-sand-600">
        {artefact.label} · {artefact.dish} · {artefact.price}
      </p>
    );
  }
  return (
    <p
      aria-hidden="true"
      className="artefact-strike mt-4 flex max-w-xs items-baseline gap-x-2 font-mono text-caption text-sand-600"
    >
      {/* nowrap partout (« 21,00 € » contient une espace) ; pas de truncate/overflow : la ligne
          tient à 312 px et un item flex en overflow hidden fragilise la synthèse de baseline. */}
      <span className="whitespace-nowrap">{artefact.dish}</span>
      <span className="leader-dots min-w-6 flex-1" />
      <span className="shrink-0 tabular-nums whitespace-nowrap">{artefact.price}</span>
    </p>
  );
}

function CellContent({ item, index }: { item: ProblemItem; index: number }) {
  return (
    <>
      {WATERMARK_INDEXES.has(index) && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-5 font-mono text-display-lg leading-none tabular-nums text-sand-200 select-none",
            index % 2 === 1 ? "left-0 md:left-8" : "left-0",
          )}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
      )}
      {index === 2 && <HairlineTail side="left" />}
      {index === 3 && <HairlineTail side="right" />}
      {/* Ligne de conduite : le titre, puis UNE unité de wrap « points + chiffre » — à la suite
          du titre si ça tient, sinon entière sur la ligne suivante (les points partent alors du
          bord gauche). flex-wrap casse item par item : sans ce groupe, le chiffre se retrouverait
          seul à gauche de la ligne 2 dans une fenêtre de 50–140 px par titre. Le groupe est
          flex-auto (base = max-content = 32 + 12 + chiffre) et le chiffre nowrap/shrink-0 :
          avec flex-1 (basis 0 → min-content = son mot le plus long) le chiffre se cassait sur
          deux lignes à lg. */}
      <div className="relative flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 id={titleIdFor(item.key)} className="text-h3 text-balance text-canard-950">
          {item.title}
        </h3>
        <span aria-hidden="true" className="flex flex-auto items-baseline gap-x-3">
          <span className="leader-dots min-w-8 flex-1" />
          <span className="shrink-0 font-mono text-caption tabular-nums whitespace-nowrap text-canard-700">
            {item.figure}
          </span>
        </span>
      </div>
      <p className="mt-2 text-body text-sand-700">{item.body}</p>
      {item.artefact && <Artefact artefact={item.artefact} />}
    </>
  );
}

export function ProblemGrid({ items }: { items: ProblemItem[] }) {
  const reduce = useReducedMotionSafe();
  const [inView, setInView] = useState(false);

  if (reduce) {
    return (
      <div className={GRID_CLASS} data-inview="">
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
      {/* Cascade REVEAL_* orchestrée par la grille — seul mouvement JS de la grille. `data-inview`
          déclenche les artefacts CSS (règles [data-inview] de globals.css) au même instant. */}
      <m.div
        className={GRID_CLASS}
        data-inview={inView ? "" : undefined}
        variants={REVEAL_CONTAINER}
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
        onViewportEnter={() => setInView(true)}
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
