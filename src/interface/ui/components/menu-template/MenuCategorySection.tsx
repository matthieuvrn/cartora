import type { PublicMenuCategory } from "@/domain/menu/PublicMenuTypes";
import type { CategoryType } from "@/domain/menu/MenuTypes";
import { MenuItemRow } from "./MenuItemRow";

type Props = {
  category: PublicMenuCategory;
  locale: "fr" | "en";
  categoryLabels: Record<CategoryType, string>;
  badgeLabels: Record<"NEW" | "POPULAR", string>;
};

export function MenuCategorySection({
  category,
  locale,
  categoryLabels,
  badgeLabels,
}: Props) {
  if (category.items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">
        {categoryLabels[category.type]}
      </h2>
      <ul className="divide-y">
        {category.items.map((item, index) => (
          <MenuItemRow
            key={index}
            item={item}
            locale={locale}
            badgeLabels={badgeLabels}
          />
        ))}
      </ul>
    </section>
  );
}
