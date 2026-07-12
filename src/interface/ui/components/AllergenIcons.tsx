import { Icon } from "@iconify/react";
import barley from "@iconify-icons/mdi/barley";
import egg from "@iconify-icons/mdi/egg";
import fish from "@iconify-icons/mdi/fish";
import peanut from "@iconify-icons/mdi/peanut";
import sprout from "@iconify-icons/mdi/sprout";
import cheese from "@iconify-icons/mdi/cheese";
import nut from "@iconify-icons/mdi/nut";
import leaf from "@iconify-icons/mdi/leaf";
import bottleSoda from "@iconify-icons/mdi/bottle-soda";
import seed from "@iconify-icons/mdi/seed";
import bottleWine from "@iconify-icons/mdi/bottle-wine";
import flower from "@iconify-icons/mdi/flower";
import snail from "@iconify-icons/mdi/snail";
import type { Allergen } from "@/domain/menu/ItemPolicy";

export type AllergenLabels = Record<Allergen, { short: string; legal: string }>;

// MDI n'a pas de crustacé/crevette (l'ancien `jellyfish` = méduse, sémantiquement FAUX). Glyphe
// crevette inline (tracé Lucide `shrimp`, ISC) passé en `IconifyIcon` brut à `<Icon>` — donc aucune
// dépendance d'icône ajoutée. Stroke-based (vs MDI plein) mais hérite de `currentColor` comme le reste.
const SHRIMP_ICON = {
  body:
    '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round"><path d="M11 12h.01"/>' +
    '<path d="M13 22c.5-.5 1.12-1 2.5-1-1.38 0-2-.5-2.5-1"/>' +
    '<path d="M14 2a3.28 3.28 0 0 1-3.227 1.798l-6.17-.561A2.387 2.387 0 1 0 4.387 8H15.5a1 1 0 0 1 0 13 1 1 0 0 0 0-5H12a7 7 0 0 1-7-7V8"/>' +
    '<path d="M14 8a8.5 8.5 0 0 1 0 8"/><path d="M16 16c2 0 4.5-4 4-6"/></g>',
  width: 24,
  height: 24,
};

export const ALLERGEN_ICONS: Record<Allergen, Parameters<typeof Icon>[0]["icon"]> = {
  GLUTEN: barley,
  CRUSTACEANS: SHRIMP_ICON,
  EGGS: egg,
  FISH: fish,
  PEANUTS: peanut,
  SOYBEANS: sprout,
  MILK: cheese,
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
          // AUSSI dans les rangées de l'éditeur (ItemRow/DailyDishCard), hors `[data-template]` —
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
