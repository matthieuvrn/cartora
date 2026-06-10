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
    <section
      className="mt-8 rounded-lg border p-4"
      style={{
        backgroundColor: "var(--menu-allergen-panel-bg, rgba(255, 251, 235, 0.6))",
        color: "var(--menu-allergen-panel-fg, #78350f)",
        borderColor: "var(--menu-allergen-panel-border, rgba(120, 53, 15, 0.18))",
      }}
    >
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide">{title}</h2>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
        {items.map((a) => (
          <li key={a} className="flex items-center gap-2 text-sm">
            <Icon icon={ALLERGEN_ICONS[a]} width={18} height={18} aria-hidden="true" />
            <span>{labels[a].legal}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
