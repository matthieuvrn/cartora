import { Icon } from "@iconify/react";
import { ALLERGEN_VALUES, type Allergen } from "@/domain/menu/ItemPolicy";
import { ALLERGEN_ICONS, type AllergenLabels } from "./AllergenIcons";

type Props = {
  presentAllergens: ReadonlySet<Allergen>;
  labels: AllergenLabels;
  title: string;
};

export function AllergenLegend({ presentAllergens, labels, title }: Props) {
  if (presentAllergens.size === 0) return null;
  const items = ALLERGEN_VALUES.filter((a) => presentAllergens.has(a));
  return (
    // Panneau via le contrat `--menu-allergen-panel-*` (défaut amber inline). Tokenisé pour que les
    // skins sombres (NOIR/NEON) le rendent sur surface foncée — sans ça, une boîte amber claire
    // « flotterait » sur le fond charbon/nuit (Étape 6 — keystone).
    // `@container` + `@lg:` (container-query Tailwind 4) : la grille répond à la LARGEUR DU PANNEAU,
    // pas au viewport — donc 1 colonne dans la frame 375px de l'aperçu (sur viewport desktop) ET sur
    // téléphone réel, 2 colonnes seulement quand le menu est large. `sm:` (viewport) cramait 3 col
    // dans 375px → mur illisible.
    <section
      className="@container mt-8 rounded-lg border p-4"
      style={{
        backgroundColor: "var(--menu-allergen-panel-bg, rgba(255, 251, 235, 0.6))",
        color: "var(--menu-allergen-panel-fg, #78350f)",
        borderColor: "var(--menu-allergen-panel-border, rgba(120, 53, 15, 0.18))",
      }}
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">{title}</h2>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-3 @lg:grid-cols-2">
        {items.map((a) => (
          <li key={a} className="flex items-start gap-2.5">
            <Icon
              icon={ALLERGEN_ICONS[a]}
              width={20}
              height={20}
              aria-hidden="true"
              className="mt-0.5 shrink-0"
            />
            <div className="min-w-0">
              <span className="block text-sm font-medium leading-tight">{labels[a].short}</span>
              <span className="block text-xs leading-snug opacity-80">{labels[a].legal}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
