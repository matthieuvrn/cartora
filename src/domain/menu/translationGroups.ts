import {
  TRANSLATION_FIELDS,
  type TranslationField,
  type TranslationEntityType,
  type TranslationUnit,
} from "./translationStatus";

/**
 * Regroupement d'affichage des unités traduisibles (S4) : replie le tableau plat
 * `units` (une entrée par CHAMP) en `sections → entités → champs`, pour que
 * l'écran de revue rende **une carte par entité** (nom + description ensemble)
 * plutôt qu'une carte par champ. Fonction pure et générique : le paramètre `U`
 * laisse remonter tout enrichissement applicatif (ex. `perLocale`) sans que le
 * domaine en dépende.
 *
 * Aucune donnée supplémentaire n'est requise : `buildTranslationUnits` fournit
 * déjà `group` (nom de catégorie source, ou "categories"/"today"/"formulas") et
 * `sourceText` (dont celui du champ `name` sert de titre de carte). Les noms de
 * catégories sont uniques par menu (index fonctionnel), donc le regroupement par
 * `group` est sans ambiguïté.
 */

export type TranslationEntityGroup<U extends TranslationUnit = TranslationUnit> = {
  entityType: TranslationEntityType;
  entityId: string;
  /** Titre de la carte = texte source du champ `name` de l'entité. */
  title: string;
  /** Champs de l'entité, ordonnés `name` puis `description`. */
  fields: U[];
};

export type TranslationSection<U extends TranslationUnit = TranslationUnit> = {
  /** Clé stable : "categories" | "today" | "formulas" | <nom de catégorie source>. */
  key: string;
  /**
   * Clé i18n de section (`Translations.group*`) ou `null` quand `key` est un nom de
   * catégorie à afficher tel quel.
   */
  labelKey: "categories" | "today" | "formulas" | null;
  entities: TranslationEntityGroup<U>[];
};

const FIELD_ORDER: Record<TranslationField, number> = TRANSLATION_FIELDS.reduce(
  (acc, field, index) => {
    acc[field] = index;
    return acc;
  },
  {} as Record<TranslationField, number>,
);

function labelKeyForGroup(group: string): TranslationSection["labelKey"] {
  if (group === "categories" || group === "today" || group === "formulas") return group;
  return null;
}

export function groupTranslationUnits<U extends TranslationUnit>(
  units: readonly U[],
): TranslationSection<U>[] {
  // Ordre de première apparition préservé (Map) → sections et entités restent
  // dans l'ordre du menu.
  const sections = new Map<string, TranslationSection<U>>();
  const entitiesByKey = new Map<string, TranslationEntityGroup<U>>();

  for (const unit of units) {
    let section = sections.get(unit.group);
    if (!section) {
      section = { key: unit.group, labelKey: labelKeyForGroup(unit.group), entities: [] };
      sections.set(unit.group, section);
    }

    const entityKey = `${unit.group}:${unit.entityType}:${unit.entityId}`;
    let entity = entitiesByKey.get(entityKey);
    if (!entity) {
      entity = { entityType: unit.entityType, entityId: unit.entityId, title: "", fields: [] };
      entitiesByKey.set(entityKey, entity);
      section.entities.push(entity);
    }

    entity.fields.push(unit);
  }

  for (const entity of entitiesByKey.values()) {
    entity.fields.sort((a, b) => FIELD_ORDER[a.field] - FIELD_ORDER[b.field]);
    const nameField = entity.fields.find((f) => f.field === "name");
    entity.title = (nameField ?? entity.fields[0])?.sourceText ?? "";
  }

  return [...sections.values()];
}
