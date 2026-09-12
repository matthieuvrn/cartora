import { useTranslations } from "next-intl";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { RevealHeading, RevealVisual } from "@/interface/ui/landing/Reveal";
import { HighlightSweep } from "@/interface/ui/landing/HighlightSweep";
import {
  ProblemGrid,
  type ProblemArtefact,
  type ProblemItem,
  type ProblemPainKey,
} from "./ProblemGrid";

// 4 douleurs de poids égal, ordre figé par la copy.
const PAIN_KEYS: readonly ProblemPainKey[] = ["ardoise", "pdf", "wix", "allergens"] as const;

// Plats du seed démo (scripts/seed-demo.ts) : Blanquette = plat du jour réel (1850), Risotto = le
// plat du hero (2100). Noms FR + prix format FR sur /en aussi — même contrat que HeroLiveDemo et
// LandingFeatures (carte authentique d'un bistrot français, comme /m/demo-cartora). Apostrophe
// typographique (’) comme partout sur la landing ; le seed garde sa chaîne droite : le contrat
// est nom + prix, pas le glyphe. Resynchroniser si le seed change. Jamais un prix Cartora.
const ARTEFACT_SEED = {
  ardoise: { dish: "Blanquette de veau à l’ancienne", price: "18,50 €" },
  pdf: { dish: "Risotto aux cèpes", price: "21,00 €" },
} as const;

/**
 * Scène porcelaine, header « double page » (kicker + thread à gauche, h2 en regard à droite —
 * seul header asymétrique des sections porcelaine, et seul h2 porcelaine en display-lg à md),
 * grille 2×2 « carte de restaurant » à hairlines fondues sur la gouttière centrale (ProblemGrid),
 * puis l'aside honnêteté. Corail : le point d'eyebrow (6 px, grammaire) est le SEUL corail de la
 * section — arbitrage frontière constat → méthode, variante A : le climax texte corail de ce
 * voisinage est « environ 10 minutes » (corail-600, étape 2 de Comment ça marche) ; ici la chute
 * « À vous de comparer » est balayée d'un lavis craie sand-200 (HighlightSweep) et le liseré est
 * sand-300 — jamais deux climax co-visibles. Aucun lien, aucun tracking.
 *
 * Contrats : (1) le `.eyebrow-thread` reste au bord GAUCHE du conteneur, à py-12/md:py-16 sous
 * la coupe — la ligne qui tombe de LandingTrustStrip atterrit dessus ; AUCUN `bg-*` sur cette
 * section ni sur un wrapper (pendant le fade d'entrée, un fond propre masquerait la chute
 * sand-400 peinte depuis la strip) ; (2) les artefacts citent UNIQUEMENT des plats du seed
 * (ARTEFACT_SEED), en français et en format FR sur /en (contrat HeroLiveDemo / LandingFeatures),
 * et la ligne « PDF » est biffée EN ENTIER — jamais « ancien prix barré → nouveau prix », visuel
 * retiré de Features parce qu'il se lisait comme une PROMOTION ; (3) `overflow-x-clip` sur la
 * <section> (jamais `overflow-hidden`, jamais sur la div max-w-6xl) : les queues de hairline
 * dépassent du conteneur et la chute de la strip déborde par le haut.
 */
export function LandingProblem() {
  const t = useTranslations("Landing.problem");

  const artefactFor = (key: ProblemPainKey): ProblemArtefact | undefined => {
    if (key === "ardoise")
      return { kind: "chalk", label: t("pains.ardoise.artefact.label"), ...ARTEFACT_SEED.ardoise };
    if (key === "pdf") return { kind: "strike", ...ARTEFACT_SEED.pdf };
    return undefined;
  };

  const items: ProblemItem[] = PAIN_KEYS.map((key) => ({
    key,
    title: t(`pains.${key}.title`),
    body: t(`pains.${key}.body`),
    figure: t(`pains.${key}.figure`),
    artefact: artefactFor(key),
  }));

  return (
    <LandingSection id="problem" ariaLabelledBy="problem-heading" className="overflow-x-clip">
      <div className="relative">
        {/* Gouttière centrale : la suspension du « … » portée par la mise en page — transparente en
            haut du header, pleine à la hauteur du h2, traverse la grille, s'éteint 48 px sous elle. */}
        <span
          aria-hidden="true"
          className="hairline-fade-y absolute top-0 -bottom-12 left-1/2 hidden w-px bg-sand-200 md:block"
        />
        <header className="mb-10 md:mb-12 md:grid md:grid-cols-2">
          <div>
            <span aria-hidden="true" className="eyebrow-thread" />
            <p className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              {t("kicker")}
            </p>
          </div>
          {/* Cap de la première ligne du h2 sur le cap du kicker (±4 px) : md:pt-* réglé à 2× en
              recette (15 = thread 2,5 rem + marge 1,25 rem aligne les boîtes de ligne, pas les
              caps) ; pl-8 = la gouttière des cellules 02/04. display-xl seulement dès lg
              (colonne 328 px à md) — seul h2 porcelaine dans ce cas, décision consignée. */}
          <RevealHeading
            id="problem-heading"
            className="mt-4 text-display-lg text-balance md:mt-0 md:pt-15 md:pl-8 lg:text-display-xl"
          >
            {t("title")}
          </RevealHeading>
        </header>
        <ProblemGrid items={items} />
      </div>

      {/* Aside « honnêteté » — fusion de l'ancienne section Comparaison (2026) : seuls ses deux
          angles UNIQUES survivent. Entrée REVEAL_VISUAL depuis le liseré, puis le balayage craie
          (enfant de variants) conclut la section. */}
      <RevealVisual className="mt-12 origin-left md:mt-14">
        <div className="max-w-3xl space-y-6 border-l-2 border-sand-300 pl-8">
          <p className="text-body-lg text-sand-700">
            <strong className="display text-h3 text-canard-950 italic">
              {t("aside.website.title")}
            </strong>{" "}
            {t("aside.website.body")}
          </p>
          <p className="text-body-lg text-sand-700">
            <strong className="display text-h3 text-canard-950 italic">
              {t("aside.others.title")}
            </strong>{" "}
            {t.rich("aside.others.body", {
              em: (chunks) => <HighlightSweep>{chunks}</HighlightSweep>,
            })}
          </p>
        </div>
      </RevealVisual>
    </LandingSection>
  );
}
