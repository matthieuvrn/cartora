import { useTranslations } from "next-intl";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { StaggerGroup, StaggerItem } from "@/interface/ui/landing/StaggerReveal";
import { TrackedCtaButton } from "@/interface/ui/landing/TrackedCtaButton";
import { HowItWorksProgressLine } from "./HowItWorksProgressLine";

type StepKey = "step1" | "step2" | "step3";

const STEPS: ReadonlyArray<{ key: StepKey; number: number }> = [
  { key: "step1", number: 1 },
  { key: "step2", number: 2 },
  { key: "step3", number: 3 },
] as const;

/**
 * « La méthode » — composition OUVERTE (DA 2026, plus de cards clonées) : ligne de métro
 * révélée au scroll, puis 3 colonnes séparées par des hairlines, chacune portée par le
 * registre mono (« Étape 01 ») — la voix « précision tech » du système typographique.
 */
export function LandingHowItWorks() {
  const t = useTranslations("Landing.howItWorks");

  return (
    <LandingSection id="how-it-works">
      <header className="mb-10 max-w-[38rem]">
        <span aria-hidden="true" className="eyebrow-thread" />
        <p className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          {t("kicker")}
        </p>
        <h2 className="mt-5 text-display-lg md:text-display-xl">{t("title")}</h2>
      </header>

      <HowItWorksProgressLine />

      {/* Stagger d'entrée des 3 étapes — section parente en variant="fade". */}
      <StaggerGroup
        as="ol"
        className="grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-sand-200"
      >
        {STEPS.map(({ key, number }) => {
          const titleId = `how-it-works-${key}-title`;
          return (
            <StaggerItem key={key} as="li" className="md:px-8 md:first:pl-0 md:last:pr-0">
              <span className="font-mono text-micro tracking-[0.16em] text-sand-500 uppercase">
                {t("stepLabel")} {String(number).padStart(2, "0")}
              </span>
              <h3 id={titleId} className="mt-4 text-h3 text-canard-950">
                {t(`${key}.title`)}
              </h3>
              <p className="mt-2.5 text-body text-sand-700">{t(`${key}.body`)}</p>
            </StaggerItem>
          );
        })}
      </StaggerGroup>

      {/* Pont de conversion : le momentum des 3 étapes débouche sur un geste, pas sur du vide. */}
      <div className="mt-10">
        <TrackedCtaButton event="cta_how_signup" href="/signup?src=how" variant="outline" arrow>
          {t("cta")}
        </TrackedCtaButton>
      </div>
    </LandingSection>
  );
}
