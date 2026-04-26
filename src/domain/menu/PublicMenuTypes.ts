import type { Allergen, ItemBadge } from "./ItemPolicy";
import type { CategoryType, MenuOverview } from "./MenuTypes";

export type PublicMenuItem = {
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  priceCents: number;
  badge: ItemBadge;
  allergens: Allergen[];
};

export type PublicMenuCategory = {
  type: CategoryType;
  items: PublicMenuItem[];
};

export type PublicMenuSnapshot = {
  restaurantName: string;
  categories: PublicMenuCategory[];
  publishedAt: string;
};

export function buildPublicSnapshot(
  menu: MenuOverview,
  restaurantName: string,
  publishedAt: string,
): PublicMenuSnapshot {
  const categories: PublicMenuCategory[] = menu.categories
    .map((category) => ({
      type: category.type,
      items: category.items
        .filter((item) => item.isAvailable)
        .map((item) => ({
          nameFr: item.translations.fr.name,
          nameEn: item.translations.en.name,
          descriptionFr: item.translations.fr.description,
          descriptionEn: item.translations.en.description,
          priceCents: item.priceCents,
          badge: item.badge,
          allergens: item.allergens,
        })),
    }))
    .filter((category) => category.items.length > 0);

  return { restaurantName, categories, publishedAt };
}
