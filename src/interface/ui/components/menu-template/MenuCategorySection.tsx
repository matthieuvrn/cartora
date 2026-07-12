import type { PublicMenuCategory } from "@/domain/menu/PublicMenuTypes";
import { resolveText, type MenuLocale } from "@/domain/menu/MenuLocale";
import { MenuItemRow } from "./MenuItemRow";
import type { AllergenLabels } from "../AllergenIcons";

type Props = {
  category: PublicMenuCategory;
  locale: MenuLocale;
  /** Langue source du menu — dernier repli de `resolveText` (S4). */
  sourceLocale: MenuLocale;
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  allergenLabels: AllergenLabels;
  allergenSectionLabel: string;
  /** Ancre de la nav rapide (cf. `categoryAnchorId`) — `scroll-mt` compense le header sticky. */
  id?: string;
};

export function MenuCategorySection({
  category,
  locale,
  sourceLocale,
  badgeLabels,
  allergenLabels,
  allergenSectionLabel,
  id,
}: Props) {
  if (category.items.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="menu-heading menu-category-title mb-2 text-lg font-semibold">
        {resolveText(category.texts.name, locale, sourceLocale) || category.name}
      </h2>
      <ul className="menu-divide divide-y" role="list">
        {category.items.map((item, index) => (
          // Clé stable au switch de langue : nom source + index (les items publics n'ont pas d'id).
          <MenuItemRow
            key={`${resolveText(item.texts.name, sourceLocale, sourceLocale)}-${index}`}
            item={item}
            locale={locale}
            sourceLocale={sourceLocale}
            badgeLabels={badgeLabels}
            allergenLabels={allergenLabels}
            allergenSectionLabel={allergenSectionLabel}
          />
        ))}
      </ul>
    </section>
  );
}
