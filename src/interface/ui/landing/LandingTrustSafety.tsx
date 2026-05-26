import Link from "next/link";
import { useTranslations } from "next-intl";
import { FileCheck2, Lock, ServerCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LandingSection } from "@/interface/ui/landing/LandingSection";

type BlockKey = "hostingEu" | "stripe" | "rgpd";

const BLOCKS: ReadonlyArray<{ key: BlockKey; Icon: LucideIcon }> = [
  { key: "hostingEu", Icon: ServerCog },
  { key: "stripe", Icon: Lock },
  { key: "rgpd", Icon: FileCheck2 },
] as const;

export function LandingTrustSafety() {
  const t = useTranslations("Landing.trustSafety");

  return (
    <LandingSection id="trust-safety" className="bg-muted/30">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {BLOCKS.map(({ key, Icon }) => {
          const titleId = `trust-safety-${key}-title`;
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
                {key === "rgpd" && (
                  <p className="mt-3">
                    <Link
                      href="/confidentialite"
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      {t("rgpd.linkLabel")}
                    </Link>
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </LandingSection>
  );
}
