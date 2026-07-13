import type { Allergen, ItemBadge } from "./ItemPolicy";
import type {
  DailyDishData,
  EntityTexts,
  FormulaData,
  MenuOverview,
  MenuTemplate,
} from "./MenuTypes";
import type { LocalizedText, MenuLocale } from "./MenuLocale";

export type PublicMenuItem = {
  /** Textes localisés (S4) — clés limitées à `availableLocales`. */
  texts: EntityTexts;
  priceCents: number;
  badge: ItemBadge;
  allergens: Allergen[];
};

/**
 * Plat du jour (S3.1) sérialisé dans le snapshot publié. Le snapshot est figé,
 * mais la lecture publique filtre par `validUntilISO > now()` via `GetPublicMenu` +
 * Clock injecté. Le texte est porté par `texts` (résolu à la lecture via `resolveText`).
 */
export type PublicMenuDailyDish = {
  id: string;
  texts: EntityTexts;
  priceCents: number;
  badge: ItemBadge;
  allergens: Allergen[];
  validUntilISO: string;
};

/**
 * Formule (S3.2) sérialisée dans le snapshot. Pas d'image ni d'allergènes (cf.
 * `FormulaData`). Composition embarquée dans `texts.description` (multi-ligne).
 * Même logique d'expiration que `PublicMenuDailyDish` : `validUntilISO` est conservé
 * pour le filtrage à la lecture.
 */
export type PublicMenuFormula = {
  id: string;
  texts: EntityTexts;
  priceCents: number;
  validUntilISO: string;
};

export type PublicMenuCategory = {
  /** Nom dans la langue SOURCE — sert d'ancre/clé stable au switch de langue. */
  name: string;
  /** Nom localisé (S4) — clés limitées à `availableLocales`. */
  texts: { name: LocalizedText };
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
  /**
   * Version du format (S4). Toujours `2` depuis le retrait de la compat v1
   * (pré-multilingue) en 2026 — plus aucun branchement sur cette valeur.
   */
  snapshotVersion?: 2;
  /** Langue de saisie du restaurant (S4). */
  sourceLocale: MenuLocale;
  /** Langues proposées dans le switcher public (source incluse). */
  availableLocales: MenuLocale[];
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

/** Restreint une map localisée aux locales disponibles + retire les valeurs vides. */
function pickLocales(map: LocalizedText, locales: readonly MenuLocale[]): LocalizedText {
  const out: LocalizedText = {};
  for (const locale of locales) {
    const value = map[locale];
    if (value && value.trim() !== "") out[locale] = value;
  }
  return out;
}

function entityTextsForSnapshot(texts: EntityTexts, locales: readonly MenuLocale[]): EntityTexts {
  return {
    name: pickLocales(texts.name, locales),
    description: pickLocales(texts.description, locales),
  };
}

export function buildPublicSnapshot(
  menu: MenuOverview,
  restaurantName: string,
  publishedAt: string,
  restaurantLogoPath?: string | null,
  branding?: PublicMenuBranding | null,
  dailyDishes: DailyDishData[] = [],
  formulaEntries: FormulaData[] = [],
): PublicMenuSnapshot {
  const sourceLocale = menu.sourceLocale;
  // availableLocales = source + langues cibles activées (jamais de doublon : enabledLocales exclut la source).
  const availableLocales: MenuLocale[] = [sourceLocale, ...menu.enabledLocales];

  const categories: PublicMenuCategory[] = menu.categories
    .map((category) => ({
      name: category.name,
      texts: { name: pickLocales(category.nameTexts, availableLocales) },
      items: category.items
        .filter((item) => item.isAvailable)
        .map((item) => ({
          texts: entityTextsForSnapshot(item.texts, availableLocales),
          priceCents: item.priceCents,
          badge: item.badge,
          allergens: item.allergens,
        })),
    }))
    .filter((category) => category.items.length > 0);

  const trimmedBranding = trimBranding(branding);

  const dailyItems: PublicMenuDailyDish[] = [...dailyDishes]
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({
      id: entry.id,
      texts: entityTextsForSnapshot(entry.texts, availableLocales),
      priceCents: entry.priceCents,
      badge: entry.badge,
      allergens: entry.allergens,
      validUntilISO: entry.validUntilISO,
    }));

  const formulas: PublicMenuFormula[] = [...formulaEntries]
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({
      id: entry.id,
      texts: entityTextsForSnapshot(entry.texts, availableLocales),
      priceCents: entry.priceCents,
      validUntilISO: entry.validUntilISO,
    }));

  return {
    snapshotVersion: 2,
    sourceLocale,
    availableLocales,
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
 * Boundary de lecture (`PrismaSnapshotRepository`) : la colonne DB est un `Json`
 * non typé. On force `snapshotVersion` et on comble défensivement `allergens`
 * (le rendu itère `item.allergens` — cf. `collectPresentAllergens`). Idempotent
 * sur un snapshot v2 fraîchement produit. La compat des snapshots v1 (pré-multilingue,
 * champs `Fr`/`En` à plat) a été retirée en 2026 — plus de reconstruction `texts`.
 */
export function normalizePublicSnapshot(snapshot: PublicMenuSnapshot): PublicMenuSnapshot {
  return {
    ...snapshot,
    snapshotVersion: 2,
    categories: snapshot.categories.map((category) => ({
      ...category,
      items: category.items.map((item) => ({ ...item, allergens: item.allergens ?? [] })),
    })),
    ...(snapshot.dailyItems
      ? {
          dailyItems: snapshot.dailyItems.map((dish) => ({
            ...dish,
            allergens: dish.allergens ?? [],
          })),
        }
      : {}),
  };
}
