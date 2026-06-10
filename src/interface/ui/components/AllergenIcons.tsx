import { Icon } from "@iconify/react";
import barley from "@iconify-icons/mdi/barley";
import jellyfish from "@iconify-icons/mdi/jellyfish";
import egg from "@iconify-icons/mdi/egg";
import fish from "@iconify-icons/mdi/fish";
import peanut from "@iconify-icons/mdi/peanut";
import sprout from "@iconify-icons/mdi/sprout";
import cup from "@iconify-icons/mdi/cup";
import nut from "@iconify-icons/mdi/nut";
import leaf from "@iconify-icons/mdi/leaf";
import bottleSoda from "@iconify-icons/mdi/bottle-soda";
import seed from "@iconify-icons/mdi/seed";
import bottleWine from "@iconify-icons/mdi/bottle-wine";
import flower from "@iconify-icons/mdi/flower";
import snail from "@iconify-icons/mdi/snail";
import type { Allergen } from "@/domain/menu/ItemPolicy";

export type AllergenLabels = Record<Allergen, { short: string; legal: string }>;

export const ALLERGEN_ICONS: Record<Allergen, Parameters<typeof Icon>[0]["icon"]> = {
  GLUTEN: barley,
  CRUSTACEANS: jellyfish,
  EGGS: egg,
  FISH: fish,
  PEANUTS: peanut,
  SOYBEANS: sprout,
  MILK: cup,
  NUTS: nut,
  CELERY: leaf,
  MUSTARD: bottleSoda,
  SESAME: seed,
  SULPHITES: bottleWine,
  LUPIN: flower,
  MOLLUSCS: snail,
};

type Props = {
  allergens: readonly Allergen[];
  labels: AllergenLabels;
  size?: number;
  listLabel: string;
  className?: string;
};

export function AllergenIcons({ allergens, labels, size = 16, listLabel, className }: Props) {
  if (allergens.length === 0) return null;
  return (
    <ul
      role="list"
      aria-label={listLabel}
      className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}
    >
      {allergens.map((a) => (
        <li
          key={a}
          // Couleurs via le contrat `--menu-allergen-*` avec défaut amber inline : ce composant rend
          // AUSSI dans les cartes de l'éditeur (ItemCard/DailyDishCard), hors `[data-template]` —
          // le fallback garde le rendu actuel partout, et seuls les skins sombres (NOIR/NEON)
          // redéfinissent les tokens pour éviter une pastille claire sur fond foncé (Étape 6).
          className="inline-flex items-center rounded-full p-1"
          style={{
            backgroundColor: "var(--menu-allergen-bg, #fffbeb)",
            color: "var(--menu-allergen-fg, #b45309)",
          }}
          title={labels[a].legal}
        >
          <Icon
            icon={ALLERGEN_ICONS[a]}
            width={size}
            height={size}
            role="img"
            aria-label={labels[a].short}
          />
        </li>
      ))}
    </ul>
  );
}
