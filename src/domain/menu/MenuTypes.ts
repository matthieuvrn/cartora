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

/**
 * Plat du jour (S3.1). Entité autonome — pas de FK vers Item. Tous les champs métier
 * sont embarqués (nom, description, prix, badge, allergens, photo). `validUntilISO`
 * est ISO 8601 UTC ; la résolution fin-de-journée est faite par `DailyMenuPolicy.defaultExpirationISO`
 * en zone Europe/Paris.
 */
export type DailyMenuEntryData = {
  id: string;
  priceCents: number;
  badge: ItemBadge;
  allergens: Allergen[];
  imagePath: string | null;
  altTextFr: string | null;
  altTextEn: string | null;
  validUntilISO: string;
  order: number;
  translations: { fr: ItemTranslations; en: ItemTranslations };
};
