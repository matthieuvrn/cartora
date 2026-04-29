import type { Allergen, ItemBadge } from "./ItemPolicy";

export type ItemTranslations = {
  name: string;
  description: string;
};

export type MenuItemData = {
  id: string;
  priceCents: number;
  badge: ItemBadge;
  allergens: Allergen[];
  isAvailable: boolean;
  order: number;
  translations: { fr: ItemTranslations; en: ItemTranslations };
};

export type MenuCategoryData = {
  id: string;
  name: string;
  order: number;
  items: MenuItemData[];
};

export type MenuOverview = {
  menuId: string;
  restaurantId: string;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  categories: MenuCategoryData[];
};
