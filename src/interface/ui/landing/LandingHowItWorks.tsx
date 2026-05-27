import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LandingSection } from "@/interface/ui/landing/LandingSection";

type StepKey = "step1" | "step2" | "step3";

const STEPS: ReadonlyArray<{ key: StepKey; number: number }> = [
  { key: "step1", number: 1 },
  { key: "step2", number: 2 },
  { key: "step3", number: 3 },
] as const;

export function LandingHowItWorks() {
  const t = useTranslations("Landing.howItWorks");

  return (
    <LandingSection id="how-it-works">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
      </header>

      <ol className="grid gap-6 lg:grid-cols-3">
        {STEPS.map(({ key, number }) => {
          const titleId = `how-it-works-${key}-title`;
          return (
            <li key={key}>
              <Card aria-labelledby={titleId} className="flex h-full flex-col">
                <CardHeader>
                  <span
                    aria-hidden="true"
                    className="flex size-10 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground"
                  >
                    {number}
                  </span>
                  <CardTitle id={titleId} className="mt-3 text-lg">
                    {t(`${key}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 text-sm text-muted-foreground">
                  <p>{t(`${key}.body`)}</p>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </LandingSection>
  );
}
