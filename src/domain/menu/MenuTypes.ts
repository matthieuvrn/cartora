import type { Allergen, ItemBadge } from "./ItemPolicy";

export const MENU_TEMPLATE_VALUES = [
  "CLASSIC",
  "CARTORA",
  "BISTRO",
  "NOIR",
  "SOLAR",
  "ZEN",
  "NEON",
  "RIVAGE",
  "VELOURS",
] as const;
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
 * est ISO 8601 UTC ; la résolution fin-de-journée est faite par `DailyDishPolicy.defaultExpirationISO`
 * en zone Europe/Paris.
 */
export type DailyDishData = {
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

/**
 * Formule de menu (S3.2). Entité autonome — pas de FK vers Item. Composition libre
 * multi-ligne dans `translations.fr.description` (séparateurs `\n`, rendu via
 * `whitespace-pre-line` côté template). Pas d'image ni d'allergènes pour le MVP :
 * une formule mélange typiquement plusieurs plats avec leurs propres allergènes,
 * la granularité allergène-par-composant est hors scope. `validUntilISO` est ISO 8601 UTC.
 */
export type FormulaData = {
  id: string;
  priceCents: number;
  validUntilISO: string;
  order: number;
  translations: { fr: ItemTranslations; en: ItemTranslations };
};
