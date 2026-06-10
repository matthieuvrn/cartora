import type { PublicMenuCategory } from "@/domain/menu/PublicMenuTypes";
import { MenuItemRow } from "./MenuItemRow";
import type { AllergenLabels } from "../AllergenIcons";

type Props = {
  category: PublicMenuCategory;
  locale: "fr" | "en";
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  allergenLabels: AllergenLabels;
  allergenSectionLabel: string;
  priorityItemIndex?: number | null;
  /** Ancre de la nav rapide (cf. `categoryAnchorId`) — `scroll-mt` compense le header sticky. */
  id?: string;
};

export function MenuCategorySection({
  category,
  locale,
  badgeLabels,
  allergenLabels,
  allergenSectionLabel,
  priorityItemIndex = null,
  id,
}: Props) {
  if (category.items.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="menu-heading menu-category-title mb-2 text-lg font-semibold">
        {category.name}
      </h2>
      <ul className="menu-divide divide-y" role="list">
        {category.items.map((item, index) => (
          <MenuItemRow
            key={item.nameFr}
            item={item}
            locale={locale}
            badgeLabels={badgeLabels}
            allergenLabels={allergenLabels}
            allergenSectionLabel={allergenSectionLabel}
            priority={index === priorityItemIndex}
          />
        ))}
      </ul>
    </section>
  );
}
