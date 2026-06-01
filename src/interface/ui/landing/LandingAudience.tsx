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

/** Couleur d'icône sémantique par type (classes littérales → détectées par Tailwind). */
const TYPES: ReadonlyArray<{ key: AudienceTypeKey; Icon: LucideIcon; iconColor: string }> = [
  { key: "traditional", Icon: UtensilsCrossed, iconColor: "text-canard-600" },
  { key: "pizzeria", Icon: Pizza, iconColor: "text-warning" },
  { key: "brasserie", Icon: Beer, iconColor: "text-sapin-500" },
  { key: "bar", Icon: Wine, iconColor: "text-canard-700" },
  { key: "cafe", Icon: Coffee, iconColor: "text-sand-700" },
  { key: "creperie", Icon: CakeSlice, iconColor: "text-warning" },
  { key: "fastfood", Icon: Sandwich, iconColor: "text-sapin-600" },
  { key: "bakery", Icon: Croissant, iconColor: "text-sand-700" },
] as const;

/** 4 fonds chauds qui se répètent pour casser la monotonie (pas 8 couleurs criardes). */
const TONES = ["bg-sand-50", "bg-sand-100", "bg-canard-50", "bg-sapin-50"] as const;

export function LandingAudience() {
  const t = useTranslations("Landing.audience");

  return (
    <LandingSection id="audience" innerClassName="py-16 md:py-24">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-h1 md:text-h2">{t("title")}</h2>
        <p className="mt-3 text-body-lg text-sand-700">{t("subtitle")}</p>
      </header>

      {/* Mobile : carousel snap-x. Desktop : grille 4 colonnes. */}
      <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
        {TYPES.map(({ key, Icon, iconColor }, i) => (
          <li
            key={key}
            className={`flex shrink-0 basis-[42%] snap-start flex-col items-center gap-3 rounded-2xl border border-canard-100/60 p-5 text-center transition-[transform,box-shadow] duration-200 ease-[var(--ease-snappy)] hover:-translate-y-1 hover:shadow-md md:basis-auto ${TONES[i % TONES.length]}`}
          >
            <Icon className={`size-[22px] stroke-[1.75] ${iconColor}`} aria-hidden="true" />
            <span className="text-body-sm font-medium text-canard-900">{t(`types.${key}`)}</span>
          </li>
        ))}
      </ul>

      <p className="mx-auto mt-10 max-w-3xl text-center text-body-sm text-sand-600">
        {t("footnote")}
      </p>
    </LandingSection>
  );
}
