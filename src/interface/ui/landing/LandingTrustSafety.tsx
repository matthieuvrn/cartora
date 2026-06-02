import Link from "next/link";
import { useTranslations } from "next-intl";
import { FileCheck2, Lock, ServerCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LandingSection } from "@/interface/ui/landing/LandingSection";

type BlockKey = "hostingEu" | "stripe" | "rgpd";

// Couleur d'icône sémantique par bloc (sort de l'uniformité `text-primary` du doc) :
// hébergement = canard, paiement = sapin (accent), conformité = canard profond.
const BLOCKS: ReadonlyArray<{ key: BlockKey; Icon: LucideIcon; iconClass: string }> = [
  { key: "hostingEu", Icon: ServerCog, iconClass: "text-canard-600" },
  { key: "stripe", Icon: Lock, iconClass: "text-sapin-600" },
  { key: "rgpd", Icon: FileCheck2, iconClass: "text-canard-700" },
] as const;

export function LandingTrustSafety() {
  const t = useTranslations("Landing.trustSafety");

  return (
    <LandingSection id="trust-safety" className="bg-canard-50/40" innerClassName="py-16 md:py-20">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-h1 md:text-h2">{t("title")}</h2>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {BLOCKS.map(({ key, Icon, iconClass }) => {
          const titleId = `trust-safety-${key}-title`;
          return (
            <Card key={key} aria-labelledby={titleId} className="flex flex-col">
              <CardHeader>
                <Icon className={`size-6 ${iconClass}`} strokeWidth={1.75} aria-hidden="true" />
                <CardTitle id={titleId} className="mt-3 font-display text-h3">
                  {t(`${key}.title`)}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 text-body-sm text-sand-600">
                <p>{t(`${key}.body`)}</p>
                {key === "rgpd" && (
                  <p className="mt-3">
                    <Link
                      href="/confidentialite"
                      className="underline underline-offset-4 hover:text-sapin-600"
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
