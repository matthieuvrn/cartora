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
  /** @deprecated S4 — lire `texts` ; supprimé au step 9 (rendu N langues). */
  nameFr: string;
  /** @deprecated S4 — lire `texts`. */
  nameEn: string;
  /** @deprecated S4 — lire `texts`. */
  descriptionFr: string;
  /** @deprecated S4 — lire `texts`. */
  descriptionEn: string;
  /** Textes localisés (S4) — clés limitées à `availableLocales`. */
  texts: EntityTexts;
  priceCents: number;
  badge: ItemBadge;
  allergens: Allergen[];
};

/**
 * Plat du jour (S3.1) sérialisé dans le snapshot publié. Le snapshot est figé,
 * mais la lecture publique filtre par `validUntilISO > now()` via `GetPublicMenu` +
 * Clock injecté. Les champs sont à plat (déjà résolus FR/EN) comme `PublicMenuItem`.
 */
export type PublicMenuDailyDish = {
  id: string;
  /** @deprecated S4 — lire `texts`. */
  nameFr: string;
  /** @deprecated S4 — lire `texts`. */
  nameEn: string;
  /** @deprecated S4 — lire `texts`. */
  descriptionFr: string;
  /** @deprecated S4 — lire `texts`. */
  descriptionEn: string;
  texts: EntityTexts;
  priceCents: number;
  badge: ItemBadge;
  allergens: Allergen[];
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
  /** @deprecated S4 — lire `texts`. */
  nameFr: string;
  /** @deprecated S4 — lire `texts`. */
  nameEn: string;
  /** @deprecated S4 — lire `texts`. */
  descriptionFr: string;
  /** @deprecated S4 — lire `texts`. */
  descriptionEn: string;
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
   * Version du format (S4). Absent = snapshot v1 (pré-multilingue) ; le normaliseur
   * l'up-convertit en v2 au boundary de lecture.
   */
  snapshotVersion?: 2;
  /** Langue de saisie du restaurant (S4) — défaut "fr" pour les snapshots v1. */
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
          // Champs legacy (step 8) — le rendu N langues du step 9 lira `texts`.
          nameFr: item.translations.fr.name,
          nameEn: item.translations.en.name,
          descriptionFr: item.translations.fr.description,
          descriptionEn: item.translations.en.description,
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
      nameFr: entry.translations.fr.name,
      nameEn: entry.translations.en.name,
      descriptionFr: entry.translations.fr.description,
      descriptionEn: entry.translations.en.description,
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
      nameFr: entry.translations.fr.name,
      nameEn: entry.translations.en.name,
      descriptionFr: entry.translations.fr.description,
      descriptionEn: entry.translations.en.description,
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
 * Forme legacy v1 (pré-S4) d'une entité : champs `Fr`/`En` à plat, sans `texts`.
 * Sert uniquement à typer la lecture des JSON legacy dans le normaliseur.
 */
type LegacyTextFields = {
  nameFr?: string;
  nameEn?: string;
  descriptionFr?: string;
  descriptionEn?: string;
  texts?: EntityTexts;
};

/** Reconstruit `texts` à partir des champs legacy fr/en (snapshots v1). */
function textsFromLegacy(entity: LegacyTextFields): EntityTexts {
  const loc = (fr?: string, en?: string): LocalizedText => {
    const map: LocalizedText = {};
    if (fr && fr.trim() !== "") map.fr = fr;
    if (en && en.trim() !== "") map.en = en;
    return map;
  };
  return {
    name: loc(entity.nameFr, entity.nameEn),
    description: loc(entity.descriptionFr, entity.descriptionEn),
  };
}

/**
 * Normalise un snapshot au boundary de lecture (`PrismaSnapshotRepository`) :
 * comble les champs absents des JSON legacy (allergènes, photos) ET up-convertit
 * les snapshots v1 (pré-multilingue) en v2 — ajoute `texts` à chaque entité +
 * `sourceLocale`/`availableLocales`/`snapshotVersion` à la racine. Le contrat
 * `PublicMenuSnapshot` (v2) devient ainsi vrai au runtime même pour un JSON ancien.
 * Idempotent sur un snapshot v2 fraîchement produit.
 */
export function normalizePublicSnapshot(snapshot: PublicMenuSnapshot): PublicMenuSnapshot {
  const sourceLocale: MenuLocale = snapshot.sourceLocale ?? "fr";
  // Snapshots v1 (bilingues fr/en) → proposer fr + en par défaut.
  const availableLocales: MenuLocale[] = snapshot.availableLocales ?? ["fr", "en"];

  return {
    ...snapshot,
    snapshotVersion: 2,
    sourceLocale,
    availableLocales,
    categories: snapshot.categories.map((category) => ({
      ...category,
      texts: category.texts ?? { name: { [sourceLocale]: category.name } },
      items: category.items.map(normalizePublicItem),
    })),
    ...(snapshot.dailyItems
      ? { dailyItems: snapshot.dailyItems.map(normalizePublicDailyDish) }
      : {}),
    ...(snapshot.formulas ? { formulas: snapshot.formulas.map(normalizePublicFormula) } : {}),
  };
}

function normalizePublicItem(item: PublicMenuItem): PublicMenuItem {
  return {
    ...item,
    allergens: item.allergens ?? [],
    texts: item.texts ?? textsFromLegacy(item),
  };
}

function normalizePublicDailyDish(dish: PublicMenuDailyDish): PublicMenuDailyDish {
  return {
    ...dish,
    allergens: dish.allergens ?? [],
    texts: dish.texts ?? textsFromLegacy(dish),
  };
}

function normalizePublicFormula(formula: PublicMenuFormula): PublicMenuFormula {
  return {
    ...formula,
    texts: formula.texts ?? textsFromLegacy(formula),
  };
}
