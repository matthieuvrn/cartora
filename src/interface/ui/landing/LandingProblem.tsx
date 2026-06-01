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
        <h2 className="text-h1 md:text-h2">{t("title")}</h2>
      </header>
      <ProblemGrid items={items} />
    </LandingSection>
  );
}
