import type { PublicMenuCategory } from "@/domain/menu/PublicMenuTypes";
import type { CategoryType } from "@/domain/menu/MenuTypes";
import { MenuItemRow } from "./MenuItemRow";
import type { AllergenLabels } from "../AllergenIcons";

type Props = {
  category: PublicMenuCategory;
  locale: "fr" | "en";
  categoryLabels: Record<CategoryType, string>;
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  allergenLabels: AllergenLabels;
  allergenSectionLabel: string;
};

export function MenuCategorySection({
  category,
  locale,
  categoryLabels,
  badgeLabels,
  allergenLabels,
  allergenSectionLabel,
}: Props) {
  if (category.items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">{categoryLabels[category.type]}</h2>
      <ul className="divide-y" role="list">
        {category.items.map((item) => (
          <MenuItemRow
            key={item.nameFr}
            item={item}
            locale={locale}
            badgeLabels={badgeLabels}
            allergenLabels={allergenLabels}
            allergenSectionLabel={allergenSectionLabel}
          />
        ))}
      </ul>
    </section>
  );
}
