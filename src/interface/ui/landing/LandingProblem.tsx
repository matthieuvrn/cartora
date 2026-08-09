import { useTranslations } from "next-intl";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { ProblemGrid, type ProblemItem, type ProblemPainKey } from "./ProblemGrid";

// 4 douleurs de poids égal, ordre figé par la copy.
const PAIN_KEYS: readonly ProblemPainKey[] = ["ardoise", "pdf", "wix", "allergens"] as const;

export function LandingProblem() {
  const t = useTranslations("Landing.problem");
  const items: ProblemItem[] = PAIN_KEYS.map((key) => ({
    key,
    title: t(`pains.${key}.title`),
    body: t(`pains.${key}.body`),
  }));

  return (
    <LandingSection id="problem" className="bg-sand-100/60" innerClassName="py-16 md:py-24">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-h2 md:text-h1">{t("title")}</h2>
      </header>
      <ProblemGrid items={items} />

      {/* Aside « honnêteté » — repris de l'ancienne section Comparaison (fusion 2026) : seuls
          ses deux angles UNIQUES survivent (site web en complément, comparaison assumée) ; les
          cas papier/agence doublonnaient avec les pains pdf/wix ci-dessus. */}
      <div className="mx-auto mt-12 max-w-3xl space-y-5 border-t border-sand-300/70 pt-8">
        {(["website", "others"] as const).map((key) => (
          <p key={key} className="text-body text-sand-700">
            <strong className="font-medium text-canard-900">{t(`aside.${key}.title`)}</strong>{" "}
            {t(`aside.${key}.body`)}
          </p>
        ))}
      </div>
    </LandingSection>
  );
}
