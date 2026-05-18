import type { Allergen, ItemBadge } from "./ItemPolicy";
import type { DailyMenuEntryData, MenuOverview, MenuTemplate } from "./MenuTypes";

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

/**
 * Plat du jour (S3.1) sérialisé dans le snapshot publié. Le snapshot est figé,
 * mais la lecture publique filtre par `validUntilISO > now()` via `GetPublicMenu` +
 * Clock injecté. Les champs sont à plat (déjà résolus FR/EN) comme `PublicMenuItem`.
 */
export type PublicMenuDailyItem = {
  id: string;
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
  validUntilISO: string;
};

export type PublicMenuCategory = {
  name: string;
  items: PublicMenuItem[];
};

/**
 * Couleurs de marque (S2.4) — gated PRO. Chaque champ est optionnel :
 * absent ⇒ le template utilise ses couleurs par défaut. Stocké en hex lowercase
 * (validé par `BrandingPolicy.normalizeHexColor`).
 */
export type PublicMenuBranding = {
  primary?: string;
  accent?: string;
  background?: string;
};

export type PublicMenuSnapshot = {
  restaurantName: string;
  /**
   * Chemin storage du logo (bucket `restaurant-logos`), résolu via `restaurantLogoUrl()`
   * côté UI. Optionnel pour la rétro-compat avec les snapshots produits avant S2.3.
   */
  restaurantLogoPath?: string;
  categories: PublicMenuCategory[];
  publishedAt: string;
  /**
   * Template de rendu choisi par le restaurateur. Optionnel pour la rétro-compat
   * avec les snapshots produits avant l'introduction de la feature S2.2 :
   * `pickTemplate(undefined)` retourne `TemplateClassic` côté UI.
   */
  template?: MenuTemplate;
  /**
   * Couleurs de marque (S2.4). Optionnel pour la rétro-compat avec les snapshots
   * pré-S2.4 et pour les restaurateurs FREE/STARTER qui n'ont pas accès à la feature.
   */
  branding?: PublicMenuBranding;
  /**
   * Plats du jour (S3.1). Optionnel pour rétro-compat avec les snapshots pré-S3.1.
   * Inclut tous les daily entries publiés sans filtrage temporel : le filtrage
   * `validUntilISO > now()` est fait à la lecture par `GetPublicMenu` via le port `Clock`,
   * de sorte que le snapshot reste immuable mais le rendu reflète l'instant courant.
   */
  dailyItems?: PublicMenuDailyItem[];
};

export function buildPublicSnapshot(
  menu: MenuOverview,
  restaurantName: string,
  publishedAt: string,
  restaurantLogoPath?: string | null,
  branding?: PublicMenuBranding | null,
  dailyEntries: DailyMenuEntryData[] = [],
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

  const trimmedBranding = trimBranding(branding);

  const dailyItems: PublicMenuDailyItem[] = [...dailyEntries]
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({
      id: entry.id,
      nameFr: entry.translations.fr.name,
      nameEn: entry.translations.en.name,
      descriptionFr: entry.translations.fr.description,
      descriptionEn: entry.translations.en.description,
      priceCents: entry.priceCents,
      badge: entry.badge,
      allergens: entry.allergens,
      imagePath: entry.imagePath,
      altTextFr: entry.altTextFr ?? "",
      altTextEn: entry.altTextEn ?? "",
      validUntilISO: entry.validUntilISO,
    }));

  return {
    restaurantName,
    ...(restaurantLogoPath ? { restaurantLogoPath } : {}),
    categories,
    publishedAt,
    template: menu.template,
    ...(trimmedBranding ? { branding: trimmedBranding } : {}),
    ...(dailyItems.length > 0 ? { dailyItems } : {}),
  };
}

function trimBranding(branding?: PublicMenuBranding | null): PublicMenuBranding | undefined {
  if (!branding) return undefined;
  const out: PublicMenuBranding = {};
  if (branding.primary) out.primary = branding.primary;
  if (branding.accent) out.accent = branding.accent;
  if (branding.background) out.background = branding.background;
  return Object.keys(out).length > 0 ? out : undefined;
}
