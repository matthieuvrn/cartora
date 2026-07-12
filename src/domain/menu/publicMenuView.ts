import type { Allergen } from "./ItemPolicy";
import type { MenuLocale } from "./MenuLocale";
import type { PublicMenuSnapshot } from "./PublicMenuTypes";

/**
 * Couche « headless » du rendu public : la prépa de données **pure** partagée par
 * tous les templates (résolution locale, format prix, collecte allergènes). Vit dans
 * le domaine — donc sans React et couvert par vitest — pour que la logique délicate
 * (quels allergènes alimentent la légende) soit testée une fois, pas répliquée dans
 * chaque skin.
 *
 * Avant cette extraction, ces fonctions étaient copiées-collées dans `MenuItemRow`
 * et les skins legacy (3+ copies, dont une `formatPrice` hardcodée `fr-FR`).
 */

/**
 * Élargi de `"fr" | "en"` à toutes les locales de contenu (S4 — multilingue).
 * Ré-export d'alias : les consommateurs existants (`import type { Locale } from
 * "...publicMenuView"`) continuent de compiler, les nouveaux modules importent
 * `MenuLocale` directement.
 */
export type Locale = MenuLocale;

/** Tags BCP 47 pour `Intl` — un pays de référence par locale de contenu. */
const INTL_TAGS: Record<MenuLocale, string> = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
};

/** Prix formaté (EUR) selon la locale — `fr-FR` → "12,00 €", `en-US` → "€12.00". */
export function formatPrice(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_TAGS[locale], {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/**
 * Mots épelés pour le libellé prix lecteur d'écran. `cents: null` = la locale
 * énonce les centimes sans unité (usage oral français : « 12 euros 50 »).
 */
const PRICE_ARIA_WORDS: Record<MenuLocale, { euros: string; cents: string | null }> = {
  fr: { euros: "euros", cents: null },
  en: { euros: "euros", cents: "cents" },
  es: { euros: "euros", cents: "céntimos" },
  de: { euros: "Euro", cents: "Cent" },
  it: { euros: "euro", cents: "centesimi" },
};

/**
 * Libellé prix pour lecteurs d'écran (épelé, sans symbole monétaire), p.ex.
 * "12 euros 50". Évite que le symbole € soit lu de façon inconsistante.
 */
export function formatPriceAria(cents: number, locale: Locale): string {
  const euros = Math.floor(cents / 100);
  const remaining = cents % 100;
  const words = PRICE_ARIA_WORDS[locale];
  if (remaining === 0) return `${euros} ${words.euros}`;
  return words.cents
    ? `${euros} ${words.euros} ${remaining} ${words.cents}`
    : `${euros} ${words.euros} ${remaining}`;
}

/**
 * Tous les allergènes présents dans le menu (items des catégories + plats du jour),
 * pour alimenter la légende INCO partagée. Les formules n'ont pas d'allergènes
 * (cf. `FormulaData`).
 */
export function collectPresentAllergens(snapshot: PublicMenuSnapshot): Set<Allergen> {
  const present = new Set<Allergen>();
  for (const daily of snapshot.dailyItems ?? []) {
    for (const a of daily.allergens) present.add(a);
  }
  for (const category of snapshot.categories) {
    for (const item of category.items) {
      for (const a of item.allergens) present.add(a);
    }
  }
  return present;
}

/**
 * Slug stable et sûr pour servir d'ancre (`id` + `href="#…"`) à une catégorie dans la
 * nav rapide du template (les noms de catégorie sont du texte libre saisi par le
 * restaurateur). Diacritiques retirés, minuscules, tout caractère non alphanumérique
 * collapsé en `-`, préfixe `cat-` (un `id` HTML ne peut commencer par un chiffre et on
 * évite la collision avec d'autres ids de la page). Repli `cat-section` si le nom ne
 * produit aucun caractère latin (ex. nom uniquement emoji). Pure → testée.
 *
 * Limite connue & assumée : deux noms distincts seulement par leurs diacritiques/symboles
 * (« Entrées » vs « entrees ») peuvent produire le même slug. Acceptable : la nav saute
 * alors à la 1re section homonyme. La fonction reste déterministe, donc le lien et la
 * section calculent toujours le même id à partir du même nom.
 */
// Plage Unicode des marques diacritiques combinantes (U+0300–U+036F) — construite depuis
// une chaîne ASCII pour ne pas stocker de caractère combinant littéral dans la source.
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

export function categoryAnchorId(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `cat-${slug || "section"}`;
}
