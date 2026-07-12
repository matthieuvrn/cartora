import type { MenuLocale } from "@/domain/menu/MenuLocale";
import type {
  TranslationEntityType,
  TranslationField,
  TranslationFieldStatus,
} from "@/domain/menu/translationStatus";

/**
 * Vue client d'une unité traduisible (un champ), telle que produite par
 * `GetTranslationOverview`. Structurellement compatible avec `TranslationUnit`
 * (domaine) pour être regroupée par `groupTranslationUnits`.
 */
export type ReviewUnit = {
  entityType: TranslationEntityType;
  entityId: string;
  field: TranslationField;
  sourceText: string;
  group: string;
  perLocale: Partial<Record<MenuLocale, { value: string; status: TranslationFieldStatus }>>;
};

/** Périmètre de langues affiché : toutes (matrice) ou une seule (focus). */
export type Scope = "all" | MenuLocale;

/** Décompte de statuts pour une langue (calculé live depuis la map de statuts). */
export type LocaleCount = {
  locale: MenuLocale;
  total: number;
  fresh: number;
  stale: number;
  missing: number;
};

/** Filtre de travail : uniquement « à relire » (défaut) ou tout. */
export type Filter = "todo" | "all";

/** Clé stable d'un champ (aligne le match de `SaveTranslations` : entityType:entityId:field). */
export function unitKey(u: { entityType: string; entityId: string; field: string }): string {
  return `${u.entityType}:${u.entityId}:${u.field}`;
}

/** Clé d'une cellule (champ × langue) dans la map de statuts live. */
export function cellKey(unitKeyStr: string, locale: MenuLocale): string {
  return `${unitKeyStr}:${locale}`;
}
