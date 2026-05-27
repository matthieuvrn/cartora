import { useTranslations } from "next-intl";
import { Calendar, Languages, Palette, Pencil, QrCode, Wheat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LandingSection } from "@/interface/ui/landing/LandingSection";

type FeatureKey = "editor" | "qr" | "allergens" | "bilingual" | "daily" | "branding";

const FEATURES: ReadonlyArray<{ key: FeatureKey; Icon: LucideIcon }> = [
  { key: "editor", Icon: Pencil },
  { key: "qr", Icon: QrCode },
  { key: "allergens", Icon: Wheat },
  { key: "bilingual", Icon: Languages },
  { key: "daily", Icon: Calendar },
  { key: "branding", Icon: Palette },
] as const;

export function LandingFeatures() {
  const t = useTranslations("Landing.features");

  return (
    <LandingSection id="features">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ key, Icon }) => {
          const titleId = `features-${key}-title`;
          return (
            <Card key={key} aria-labelledby={titleId} className="flex flex-col">
              <CardHeader>
                <Icon className="size-6 text-primary" aria-hidden="true" />
                <CardTitle id={titleId} className="mt-3 text-lg">
                  {t(`${key}.title`)}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 text-sm text-muted-foreground">
                <p>{t(`${key}.body`)}</p>
              </CardContent>
              <CardFooter>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {t(`${key}.tier`)}
                </span>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </LandingSection>
  );
}
