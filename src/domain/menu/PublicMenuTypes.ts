import type { Allergen, ItemBadge } from "./ItemPolicy";
import type { MenuOverview } from "./MenuTypes";

export type PublicMenuItem = {
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  priceCents: number;
  badge: ItemBadge;
  allergens: Allergen[];
  imagePath: string | null;
  altTextFr: string;
  altTextEn: string;
};

export type PublicMenuCategory = {
  name: string;
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
      name: category.name,
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
          imagePath: item.imagePath,
          altTextFr: item.altTextFr ?? "",
          altTextEn: item.altTextEn ?? "",
        })),
    }))
    .filter((category) => category.items.length > 0);

  return { restaurantName, categories, publishedAt };
}
