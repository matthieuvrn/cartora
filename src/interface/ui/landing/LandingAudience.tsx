import { useTranslations } from "next-intl";
import {
  Beer,
  CakeSlice,
  Coffee,
  Croissant,
  Pizza,
  Sandwich,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LandingSection } from "@/interface/ui/landing/LandingSection";

type AudienceTypeKey =
  | "traditional"
  | "pizzeria"
  | "brasserie"
  | "bar"
  | "cafe"
  | "creperie"
  | "fastfood"
  | "bakery";

const TYPES: ReadonlyArray<{ key: AudienceTypeKey; Icon: LucideIcon }> = [
  { key: "traditional", Icon: UtensilsCrossed },
  { key: "pizzeria", Icon: Pizza },
  { key: "brasserie", Icon: Beer },
  { key: "bar", Icon: Wine },
  { key: "cafe", Icon: Coffee },
  { key: "creperie", Icon: CakeSlice },
  { key: "fastfood", Icon: Sandwich },
  { key: "bakery", Icon: Croissant },
] as const;

export function LandingAudience() {
  const t = useTranslations("Landing.audience");

  return (
    <LandingSection id="audience">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
      </header>

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {TYPES.map(({ key, Icon }) => (
          <li
            key={key}
            className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center"
          >
            <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
            <span className="text-sm font-medium">{t(`types.${key}`)}</span>
          </li>
        ))}
      </ul>

      <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-muted-foreground">
        {t("footnote")}
      </p>
    </LandingSection>
  );
}
