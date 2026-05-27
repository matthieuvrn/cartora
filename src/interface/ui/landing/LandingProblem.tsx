import { useTranslations } from "next-intl";
import { AlertTriangle, CloudRain, FileText, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LandingSection } from "@/interface/ui/landing/LandingSection";

type PainKey = "ardoise" | "pdf" | "wix" | "allergens";

const PAINS: ReadonlyArray<{ key: PainKey; Icon: LucideIcon }> = [
  { key: "ardoise", Icon: CloudRain },
  { key: "pdf", Icon: FileText },
  { key: "wix", Icon: Wrench },
  { key: "allergens", Icon: AlertTriangle },
] as const;

export function LandingProblem() {
  const t = useTranslations("Landing.problem");

  return (
    <LandingSection id="problem" className="bg-muted/30">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PAINS.map(({ key, Icon }) => {
          const titleId = `problem-${key}-title`;
          return (
            <Card key={key} aria-labelledby={titleId} className="flex flex-col">
              <CardHeader>
                <Icon className="size-6 text-primary" aria-hidden="true" />
                <CardTitle id={titleId} className="mt-3 text-lg">
                  {t(`pains.${key}.title`)}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 text-sm text-muted-foreground">
                <p>{t(`pains.${key}.body`)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </LandingSection>
  );
}
