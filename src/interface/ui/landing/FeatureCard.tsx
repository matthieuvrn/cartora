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
// (clé, tier, textes i18n) — toute la présentation de la cellule vit ici. Les hairlines et les
// spans du bento sont portés par la cellule de grille STATIQUE de LandingFeatures, pas par l'article.
const CARD_ICONS: Record<FeatureKey, (props: CartoraIconProps) => ReactElement> = {
  editor: EditorIcon,
  qr: QrCodeIcon,
  allergens: WheatIcon,
  bilingual: LanguagesIcon,
  daily: CalendarIcon,
  branding: PaletteIcon,
};

// Chips tiers. « Dès Starter » = teinte canard-50 (structure). « Pro » = encre canard-950 + point
// corail de 6 px (grammaire eyebrow — même conversion que le tag « Recommandé » du pricing) :
// le corail de la section redevient trois POINTS (kicker + 2 chips), plus aucun aplat corail-50.
// La couleur dérive du discriminant `tier`, jamais du texte i18n.
const CHIP_CLASS: Record<Exclude<FeatureTier, "all">, string> = {
  starter: "border-canard-200 bg-canard-50 text-canard-800",
  pro: "border-canard-950 bg-canard-950 text-sand-50",
};

// Liseré vertical du h3 (matière au survol) : 12 px de haut, sand-300 au repos ; pleine hauteur
// et canard-600 au survol de la cellule. Posé dans la gouttière (before:-left-3) : le titre et le
// corps gardent le même bord gauche.
const TITLE_RULE_CLASS =
  "relative before:absolute before:top-1/2 before:-left-3 before:h-3 before:w-px before:-translate-y-1/2 " +
  "before:bg-sand-300 before:transition-[height,background-color] before:duration-300 " +
  "before:ease-[var(--ease-out-expo)] group-hover:before:h-full group-hover:before:bg-canard-600";

type FeatureCardProps = {
  featureKey: FeatureKey;
  tier: FeatureTier;
  title: string;
  body: string;
  /** Texte i18n du tier (« Dès Starter », « Pro »…) — couleur dérivée de `tier`, pas de ce texte. */
  tierLabel: string;
  /** Mini-visuel bento (JSX/CSS pur, décoratif) ancré en pied de cellule. */
  visual?: ReactNode;
  /**
   * Cellule héroïque (éditeur) : dès md, texte confiné à gauche (42 %) et visuel absolu ancré en
   * haut à droite (47 % → −8 px), rogné par le BAS (et de 8 px à droite) via `md:overflow-hidden`.
   * Aucune transform : la colonne des prix de la fenêtre reste entière. Sous md : flux normal.
   */
  emphasis?: boolean;
};

/**
 * Cellule du bento Features — composant SERVEUR, 0 Ko de JS client. Bento à hairlines partagées
 * (passe moodboard 2026-09) : un seul conteneur porte bord, radius et ombre ; la cellule ne
 * répond au survol que par de la MATIÈRE (liseré, pastille, grille révélée) — jamais de lift,
 * scale ou skew : une carte non cliquable n'a pas d'affordance (loi anti fausse-affordance).
 */
export function FeatureCard({
  featureKey,
  tier,
  title,
  body,
  tierLabel,
  visual,
  emphasis = false,
}: FeatureCardProps) {
  const Icon = CARD_ICONS[featureKey];
  const titleId = `feature-${featureKey}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "group relative isolate flex h-full flex-col p-6 md:p-8",
        emphasis && "md:min-h-[26rem] md:overflow-hidden",
      )}
    >
      {/* Grille hairline révélée en fond de la seule cellule survolée (matière, pas de mouvement).
          `isolate` sur l'article : le -z-10 reste DANS la cellule, au-dessus du fond du conteneur. */}
      <span
        aria-hidden="true"
        className="bg-grid-sand pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className={cn("flex items-start justify-between gap-3", emphasis && "md:max-w-[42%]")}>
        {/* Pastille d'icône unifiée — sand-50 au repos, canard-50 au survol de la cellule. */}
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sand-200 bg-sand-50 text-canard-700 transition-colors duration-300 group-hover:border-canard-200 group-hover:bg-canard-50">
          <Icon className="size-5 stroke-[1.5]" />
        </span>
        {tier !== "all" && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-micro tracking-wider uppercase",
              CHIP_CLASS[tier],
            )}
          >
            {tier === "pro" && (
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-corail-500" />
            )}
            {tierLabel}
          </span>
        )}
      </div>
      <h3
        id={titleId}
        className={cn(
          "mt-5 text-h3 text-canard-950",
          TITLE_RULE_CLASS,
          emphasis && "md:max-w-[42%]",
        )}
      >
        {title}
      </h3>
      <p className={cn("mt-2 text-body text-sand-700", emphasis && "md:max-w-[42%]")}>{body}</p>
      {visual ? (
        // Décoratif pur : le corps de cellule porte déjà l'information (a11y).
        <div
          aria-hidden="true"
          className={cn(
            "mt-auto pt-6 select-none",
            emphasis && "md:absolute md:top-16 md:-right-2 md:left-[47%] md:mt-0 md:pt-0",
          )}
        >
          {visual}
        </div>
      ) : null}
    </article>
  );
}
