import { type ReactElement, type ReactNode } from "react";
import {
  CalendarIcon,
  EditorIcon,
  LanguagesIcon,
  PaletteIcon,
  QrCodeIcon,
  WheatIcon,
  type CartoraIconProps,
} from "@/interface/ui/icons";
import { cn } from "@/lib/utils";

export type FeatureKey = "editor" | "qr" | "allergens" | "bilingual" | "daily" | "branding";
export type FeatureTier = "all" | "starter" | "pro";

// Icône custom par feature, mappée par clé : LandingFeatures ne transmet que des données
// (clé, tier, textes i18n) — toute la présentation de la carte vit ici.
const CARD_ICONS: Record<FeatureKey, (props: CartoraIconProps) => ReactElement> = {
  editor: EditorIcon,
  qr: QrCodeIcon,
  allergens: WheatIcon,
  bilingual: LanguagesIcon,
  daily: CalendarIcon,
  branding: PaletteIcon,
};

// Chips tiers (spec DA §5) : « Dès Starter » canard / « Pro » corail — seul usage corail
// autorisé de la section. La couleur dérive du discriminant `tier`, jamais du texte i18n.
const CHIP_CLASS: Record<Exclude<FeatureTier, "all">, string> = {
  starter: "border-canard-200 bg-canard-50 text-canard-800",
  pro: "border-corail-200 bg-corail-50 text-corail-700",
};

type FeatureCardProps = {
  featureKey: FeatureKey;
  tier: FeatureTier;
  title: string;
  body: string;
  /** Texte i18n du tier (« Dès Starter », « Pro »…) — couleur dérivée de `tier`, pas de ce texte. */
  tierLabel: string;
  /** Mini-visuel bento (JSX/CSS pur, décoratif) ancré en pied de carte. */
  visual?: ReactNode;
};

/**
 * Carte bento des Features — composant SERVEUR, 0 Ko de JS client. Le lift spring de la v1
 * est supprimé : une carte non cliquable n'a droit qu'à un hover de bordure (loi
 * anti fausse-affordance de la DA « Nuit de service », spec §5).
 */
export function FeatureCard({
  featureKey,
  tier,
  title,
  body,
  tierLabel,
  visual,
}: FeatureCardProps) {
  const Icon = CARD_ICONS[featureKey];

  return (
    <article className="flex h-full flex-col rounded-2xl border border-sand-200 bg-card p-6 shadow-md transition-colors duration-200 hover:border-canard-300/70 md:p-8">
      <div className="flex items-start justify-between gap-3">
        {/* Pastille d'icône unifiée (spec §5) — jamais d'icône nue flottante. */}
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sand-200 bg-sand-50 text-canard-700">
          <Icon className="size-5 stroke-[1.5]" />
        </span>
        {tier !== "all" && (
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-micro tracking-wider uppercase",
              CHIP_CLASS[tier],
            )}
          >
            {tierLabel}
          </span>
        )}
      </div>
      <h3 className="mt-5 text-h3 text-canard-950">{title}</h3>
      <p className="mt-2 text-body text-sand-700">{body}</p>
      {visual ? (
        // Décoratif pur : le corps de carte porte déjà l'information (a11y).
        <div aria-hidden="true" className="mt-auto pt-6 select-none">
          {visual}
        </div>
      ) : null}
    </article>
  );
}
