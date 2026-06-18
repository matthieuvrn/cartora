import type { Allergen, ItemBadge } from "./ItemPolicy";
import type { LocalizedText, MenuLocale } from "./MenuLocale";

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

/**
 * Textes localisés d'une entité de menu (S4 — multilingue), toutes locales
 * confondues (source comprise). Source de vérité : table `translations`.
 * `altText` est absent pour les entités sans photo (formules).
 */
export type EntityTexts = {
  name: LocalizedText;
  description: LocalizedText;
  altText?: LocalizedText;
};

export type MenuItemData = {
  id: string;
  priceCents: number;
  badge: ItemBadge;
  allergens: Allergen[];
  isAvailable: boolean;
  imagePath: string | null;
  order: number;
  /** @deprecated S4 — lire `texts` ; supprimé au step 11 (contract). */
  translations: { fr: ItemTranslations; en: ItemTranslations };
  texts: EntityTexts;
};

export type MenuCategoryData = {
  id: string;
  /** Nom dans la langue SOURCE (colonne `categories.name` — porte l'unicité et les ancres). */
  name: string;
  /** Nom toutes locales : `{ [sourceLocale]: name }` + lignes CATEGORY de `translations`. */
  nameTexts: LocalizedText;
  order: number;
  items: MenuItemData[];
};

export type MenuOverview = {
  menuId: string;
  restaurantId: string;
  status: "DRAFT" | "PUBLISHED";
  template: MenuTemplate;
  publishedAt: string | null;
  /** Langue de saisie du restaurateur (S4). */
  sourceLocale: MenuLocale;
  /** Langues cibles activées (S4) — sans la langue source. */
  enabledLocales: MenuLocale[];
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
  validUntilISO: string;
  order: number;
  /** @deprecated S4 — lire `texts` ; supprimé au step 11 (contract). */
  translations: { fr: ItemTranslations; en: ItemTranslations };
  texts: EntityTexts;
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
  /** @deprecated S4 — lire `texts` ; supprimé au step 11 (contract). */
  translations: { fr: ItemTranslations; en: ItemTranslations };
  texts: EntityTexts;
};
