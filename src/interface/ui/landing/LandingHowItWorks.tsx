import { useTranslations } from "next-intl";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { HowItWorksProgressLine } from "./HowItWorksProgressLine";

type StepKey = "step1" | "step2" | "step3";

const STEPS: ReadonlyArray<{ key: StepKey; number: number }> = [
  { key: "step1", number: 1 },
  { key: "step2", number: 2 },
  { key: "step3", number: 3 },
] as const;

export function LandingHowItWorks() {
  const t = useTranslations("Landing.howItWorks");

  return (
    <LandingSection id="how-it-works" innerClassName="py-20 md:py-28">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-h1 md:text-h2">{t("title")}</h2>
      </header>

      <ol className="relative grid gap-6 lg:grid-cols-3">
        <HowItWorksProgressLine />
        {STEPS.map(({ key, number }) => {
          const titleId = `how-it-works-${key}-title`;
          return (
            <li
              key={key}
              className="relative rounded-xl border border-canard-100 bg-card p-6 shadow-sm"
            >
              {/* Numéro Fraunces « tampon » : écho canard décalé + chiffre sapin net dessus. */}
              <span className="relative inline-block font-display text-display-lg leading-none italic">
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-0 translate-x-[3px] translate-y-[3px] text-canard-200"
                >
                  {number}
                </span>
                <span className="relative text-sapin-600">{number}</span>
              </span>
              <h3 id={titleId} className="mt-3 text-h3 text-canard-900">
                {t(`${key}.title`)}
              </h3>
              <p className="mt-2 text-body text-sand-700">{t(`${key}.body`)}</p>
            </li>
          );
        })}
      </ol>
    </LandingSection>
  );
}
