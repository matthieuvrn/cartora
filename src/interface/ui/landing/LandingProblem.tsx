import { useTranslations } from "next-intl";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { ProblemGrid, type ProblemItem, type ProblemPainKey } from "./ProblemGrid";

// 4 douleurs de poids égal, ordre figé par la copy.
const PAIN_KEYS: readonly ProblemPainKey[] = ["ardoise", "pdf", "wix", "allergens"] as const;

/**
 * Scène porcelaine, traitement éditorial « magazine » (DA Nuit de service) : header aligné
 * à gauche, grille 2×2 à hairlines internes (ProblemGrid), puis l'aside honnêteté en bloc
 * manifeste — LE climax corail de ce viewport (liseré border-corail-500).
 */
export function LandingProblem() {
  const t = useTranslations("Landing.problem");
  const items: ProblemItem[] = PAIN_KEYS.map((key) => ({
    key,
    title: t(`pains.${key}.title`),
    body: t(`pains.${key}.body`),
  }));

  return (
    <LandingSection id="problem">
      {/* Pas de sous-titre : le texte des pains suffit (spec §7). Le pt-10 des cellules de
          la grille complète le rythme vertical sous le header. */}
      <header className="mb-8 max-w-2xl md:mb-10">
        <span aria-hidden="true" className="eyebrow-thread" />
        <p className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          {t("kicker")}
        </p>
        <h2 className="mt-4 text-display-lg text-balance md:text-display-xl">{t("title")}</h2>
      </header>
      <ProblemGrid items={items} />

      {/* Aside « honnêteté » — repris de l'ancienne section Comparaison (fusion 2026) : seuls
          ses deux angles UNIQUES survivent (site web en complément, comparaison assumée) ; les
          cas papier/agence doublonnaient avec les pains pdf/wix ci-dessus. */}
      <div className="mt-12 max-w-3xl space-y-6 border-l-2 border-corail-500 pl-8 md:mt-14">
        {(["website", "others"] as const).map((key) => (
          <p key={key} className="text-body-lg text-sand-700">
            <strong className="display text-h3 text-canard-950 italic">
              {t(`aside.${key}.title`)}
            </strong>{" "}
            {t(`aside.${key}.body`)}
          </p>
        ))}
      </div>
    </LandingSection>
  );
}
