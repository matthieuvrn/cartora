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
    <section className="mt-8 rounded-lg border bg-amber-50/60 p-4 text-amber-900">
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
