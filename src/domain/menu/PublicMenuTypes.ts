import type { Allergen, ItemBadge } from "./ItemPolicy";
import type { DailyDishData, FormulaData, MenuOverview, MenuTemplate } from "./MenuTypes";

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
export type PublicMenuDailyDish = {
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

/**
 * Formule (S3.2) sérialisée dans le snapshot. Pas d'image ni d'allergènes (cf.
 * `FormulaData`). Composition embarquée dans `descriptionFr/En` (multi-ligne).
 * Même logique d'expiration que `PublicMenuDailyDish` : `validUntilISO` est conservé
 * pour le filtrage à la lecture.
 */
export type PublicMenuFormula = {
  id: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  priceCents: number;
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
  dailyItems?: PublicMenuDailyDish[];
  /**
   * Formules (S3.2). Optionnel pour rétro-compat. Même logique d'expiration et de
   * filtrage à la lecture que `dailyItems`. Affichées dans la même section "Aujourd'hui"
   * du menu public, juste sous les plats du jour.
   */
  formulas?: PublicMenuFormula[];
};

export function buildPublicSnapshot(
  menu: MenuOverview,
  restaurantName: string,
  publishedAt: string,
  restaurantLogoPath?: string | null,
  branding?: PublicMenuBranding | null,
  dailyDishes: DailyDishData[] = [],
  formulaEntries: FormulaData[] = [],
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

  const dailyItems: PublicMenuDailyDish[] = [...dailyDishes]
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

  const formulas: PublicMenuFormula[] = [...formulaEntries]
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({
      id: entry.id,
      nameFr: entry.translations.fr.name,
      nameEn: entry.translations.en.name,
      descriptionFr: entry.translations.fr.description,
      descriptionEn: entry.translations.en.description,
      priceCents: entry.priceCents,
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
    ...(formulas.length > 0 ? { formulas } : {}),
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

/**
 * Comble les champs items qui peuvent manquer dans les snapshots écrits avant
 * `allergens` (commit 29a988a) ou les photos d'item (commit 005f4d5). Le contrat
 * `PublicMenuItem` reste strict côté consommateur ; cette normalisation, appliquée
 * au boundary de lecture (`PrismaSnapshotRepository`), rend ce contrat vrai au runtime
 * même pour des JSON legacy. No-op sur les snapshots récents produits par
 * `buildPublicSnapshot`.
 */
export function normalizePublicSnapshot(snapshot: PublicMenuSnapshot): PublicMenuSnapshot {
  return {
    ...snapshot,
    categories: snapshot.categories.map((category) => ({
      ...category,
      items: category.items.map(normalizePublicItem),
    })),
    ...(snapshot.dailyItems
      ? { dailyItems: snapshot.dailyItems.map(normalizePublicDailyDish) }
      : {}),
  };
}

function normalizePublicItem(item: PublicMenuItem): PublicMenuItem {
  return {
    ...item,
    allergens: item.allergens ?? [],
    imagePath: item.imagePath ?? null,
    altTextFr: item.altTextFr ?? "",
    altTextEn: item.altTextEn ?? "",
  };
}

function normalizePublicDailyDish(dish: PublicMenuDailyDish): PublicMenuDailyDish {
  return {
    ...dish,
    allergens: dish.allergens ?? [],
    imagePath: dish.imagePath ?? null,
    altTextFr: dish.altTextFr ?? "",
    altTextEn: dish.altTextEn ?? "",
  };
}
