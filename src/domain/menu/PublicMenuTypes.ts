import type { Allergen, ItemBadge } from "./ItemPolicy";
import type { MenuOverview, MenuTemplate } from "./MenuTypes";

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
};

export function buildPublicSnapshot(
  menu: MenuOverview,
  restaurantName: string,
  publishedAt: string,
  restaurantLogoPath?: string | null,
  branding?: PublicMenuBranding | null,
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

  return {
    restaurantName,
    ...(restaurantLogoPath ? { restaurantLogoPath } : {}),
    categories,
    publishedAt,
    template: menu.template,
    ...(trimmedBranding ? { branding: trimmedBranding } : {}),
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
