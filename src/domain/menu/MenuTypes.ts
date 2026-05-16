import type { Allergen, ItemBadge } from "./ItemPolicy";

export const MENU_TEMPLATE_VALUES = ["CLASSIC", "ELEGANT", "MODERN"] as const;
export type MenuTemplate = (typeof MENU_TEMPLATE_VALUES)[number];

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
  imagePath: string | null;
  altTextFr: string | null;
  altTextEn: string | null;
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
  template: MenuTemplate;
  publishedAt: string | null;
  categories: MenuCategoryData[];
};
