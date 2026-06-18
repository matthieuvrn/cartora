import type { MenuLocale } from "./MenuLocale";
import type { DailyDishData, FormulaData, MenuOverview } from "./MenuTypes";
import { hashSourceText } from "./textHash";

/**
 * Entités porteuses de texte traduisible et champs concernés. Source de vérité
 * du contrat de la table `translations` (CHECK SQL en miroir, cf. 076).
 */
export const TRANSLATION_ENTITY_TYPES = ["ITEM", "CATEGORY", "DAILY_DISH", "FORMULA"] as const;
export type TranslationEntityType = (typeof TRANSLATION_ENTITY_TYPES)[number];

export const TRANSLATION_FIELDS = ["name", "description", "altText"] as const;
export type TranslationField = (typeof TRANSLATION_FIELDS)[number];

/**
 * Statut d'un champ traduit pour une locale cible, calculé à la volée :
 * - `missing` : aucune traduction (pas de ligne, ou valeur vide) ;
 * - `fresh`   : la traduction a été produite/validée contre le texte source actuel ;
 * - `stale`   : le texte source a changé depuis (ou ligne legacy sans hash) —
 *               la traduction existe mais mérite une relecture.
 */
export type TranslationFieldStatus = "fresh" | "stale" | "missing";

export function computeFieldStatus(params: {
  /** Valeur traduite courante pour la locale cible (undefined = pas de ligne). */
  value: string | undefined;
  /** Hash du texte source au moment de la traduction (`null` sur les lignes legacy). */
  sourceTextHash: string | null | undefined;
  /** Texte source actuel. */
  sourceText: string;
}): TranslationFieldStatus {
  if (!params.value || params.value.trim() === "") return "missing";
  if (params.sourceTextHash && params.sourceTextHash === hashSourceText(params.sourceText)) {
    return "fresh";
  }
  // Hash absent (ligne migrée avant le backfill) ou différent : conservateur ⇒ stale.
  return "stale";
}

/** Agrégat de couverture par locale, affiché au dashboard (« EN 82 % · ES 0 % »). */
export type LocaleCoverage = {
  locale: MenuLocale;
  /** Nombre de champs traduisibles (sources non vides uniquement). */
  total: number;
  fresh: number;
  stale: number;
  missing: number;
};

/**
 * Unité traduisible : un champ d'une entité dont le texte SOURCE est non vide.
 * Base commune de l'écran de revue (`GetTranslationOverview`) et de
 * l'auto-traduction (`AutoTranslateMenu`) — construite une fois ici pour que les
 * deux écrans voient exactement le même périmètre.
 */
export type TranslationUnit = {
  entityType: TranslationEntityType;
  entityId: string;
  field: TranslationField;
  /** Texte source actuel (trimé, non vide). */
  sourceText: string;
  /** Regroupement d'affichage : nom de catégorie (source), "today" ou "formulas". */
  group: string;
};

export function buildTranslationUnits(
  menu: MenuOverview,
  dailyDishes: readonly DailyDishData[],
  formulas: readonly FormulaData[],
): TranslationUnit[] {
  const units: TranslationUnit[] = [];
  const sl = menu.sourceLocale;

  const push = (
    entityType: TranslationEntityType,
    entityId: string,
    field: TranslationField,
    sourceText: string | undefined,
    group: string,
  ) => {
    const trimmed = (sourceText ?? "").trim();
    if (trimmed === "") return;
    units.push({ entityType, entityId, field, sourceText: trimmed, group });
  };

  for (const category of menu.categories) {
    push("CATEGORY", category.id, "name", category.nameTexts[sl] ?? category.name, "categories");
    for (const item of category.items) {
      push("ITEM", item.id, "name", item.texts.name[sl], category.name);
      push("ITEM", item.id, "description", item.texts.description[sl], category.name);
      if (item.imagePath) {
        push("ITEM", item.id, "altText", item.texts.altText?.[sl], category.name);
      }
    }
  }

  for (const dish of dailyDishes) {
    push("DAILY_DISH", dish.id, "name", dish.texts.name[sl], "today");
    push("DAILY_DISH", dish.id, "description", dish.texts.description[sl], "today");
    if (dish.imagePath) {
      push("DAILY_DISH", dish.id, "altText", dish.texts.altText?.[sl], "today");
    }
  }

  for (const formula of formulas) {
    push("FORMULA", formula.id, "name", formula.texts.name[sl], "formulas");
    push("FORMULA", formula.id, "description", formula.texts.description[sl], "formulas");
  }

  return units;
}

/** Longueur max d'une valeur traduite, alignée sur les policies de saisie source. */
export function maxTranslationValueLength(
  entityType: TranslationEntityType,
  field: TranslationField,
): number {
  if (field === "altText") return 200;
  if (field === "description") return 500;
  return entityType === "CATEGORY" ? 50 : 100;
}
