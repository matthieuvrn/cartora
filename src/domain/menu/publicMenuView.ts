import type { Allergen } from "./ItemPolicy";
import type { PublicMenuSnapshot } from "./PublicMenuTypes";

/**
 * Couche « headless » du rendu public : la prépa de données **pure** partagée par
 * tous les templates (résolution locale, format prix, collecte allergènes, priorité
 * LCP). Vit dans le domaine — donc sans React et couvert par vitest — pour que la
 * logique délicate (quel item prend le slot LCP, quels allergènes alimentent la
 * légende) soit testée une fois, pas répliquée dans chaque skin.
 *
 * Avant cette extraction, ces fonctions étaient copiées-collées dans `MenuItemRow`,
 * `TemplateElegant`, `TemplateModern` (3+ copies, dont une `formatPrice` hardcodée
 * `fr-FR`).
 */

export type Locale = "fr" | "en";

/** Texte localisé avec repli FR quand la traduction EN est vide. */
export function getLocalizedText(fr: string, en: string, locale: Locale): string {
  if (locale === "en") return en || fr;
  return fr;
}

/** Prix formaté (EUR) selon la locale — `fr-FR` → "12,00 €", `en-US` → "€12.00". */
export function formatPrice(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/**
 * Libellé prix pour lecteurs d'écran (épelé, sans symbole monétaire), p.ex.
 * "12 euros 50". Évite que le symbole € soit lu de façon inconsistante.
 */
export function formatPriceAria(cents: number, locale: Locale): string {
  const euros = Math.floor(cents / 100);
  const remaining = cents % 100;
  if (locale === "fr") {
    return remaining > 0 ? `${euros} euros ${remaining}` : `${euros} euros`;
  }
  return remaining > 0 ? `${euros} euros ${remaining} cents` : `${euros} euros`;
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

/** Localise le premier item de catégorie portant une photo (slot LCP candidat). */
export type LcpItemLocator = { categoryName: string; itemIndex: number };

export type LcpPriority = {
  /** Au moins un plat du jour a une photo → c'est lui qui prend la priorité LCP. */
  dailyHasPhoto: boolean;
  /** Index du 1er plat du jour avec photo (`-1` si aucun) — comme `findIndex`. */
  firstDailyPhotoIndex: number;
  /**
   * 1er item de catégorie avec photo, retenu pour le `priority` Next/Image —
   * UNIQUEMENT si aucun plat du jour n'a de photo (le daily prime, rendu plus haut).
   */
  firstPhotoLocator: LcpItemLocator | null;
};

/**
 * Calcule la cible de chargement prioritaire (LCP) d'un snapshot. Règle conservée
 * à l'identique des templates : si un plat du jour a une photo, il prend le slot
 * (rendu en tête) ; sinon on retombe sur la 1re photo des catégories.
 */
export function resolveLcpPriority(snapshot: PublicMenuSnapshot): LcpPriority {
  const dailyItems = snapshot.dailyItems ?? [];
  const dailyHasPhoto = dailyItems.some((d) => d.imagePath);
  const firstDailyPhotoIndex = dailyItems.findIndex((d) => d.imagePath);

  let firstPhotoLocator: LcpItemLocator | null = null;
  if (!dailyHasPhoto) {
    for (const category of snapshot.categories) {
      const itemIndex = category.items.findIndex((item) => item.imagePath);
      if (itemIndex !== -1) {
        firstPhotoLocator = { categoryName: category.name, itemIndex };
        break;
      }
    }
  }

  return { dailyHasPhoto, firstDailyPhotoIndex, firstPhotoLocator };
}
