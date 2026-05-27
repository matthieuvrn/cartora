import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LandingSection } from "@/interface/ui/landing/LandingSection";

type CardKey = "paper" | "website" | "other";

const CARDS: ReadonlyArray<CardKey> = ["paper", "website", "other"] as const;

export function LandingComparison() {
  const t = useTranslations("Landing.comparison");

  return (
    <LandingSection id="comparison">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {CARDS.map((key) => {
          const titleId = `comparison-${key}-title`;
          return (
            <Card key={key} aria-labelledby={titleId} className="flex flex-col">
              <CardHeader>
                <CardTitle id={titleId} className="text-lg">
                  {t(`cards.${key}.label`)}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 text-sm leading-relaxed text-muted-foreground">
                <p>{t(`cards.${key}.body`)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </LandingSection>
  );
}
