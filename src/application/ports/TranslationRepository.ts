import type { MenuLocale } from "@/domain/menu/MenuLocale";
import type { TranslationEntityType, TranslationField } from "@/domain/menu/translationStatus";

// Ré-exports : la source de vérité vit dans le domaine (translationStatus.ts),
// l'infra et les use cases consomment via ce port.
export { TRANSLATION_ENTITY_TYPES, TRANSLATION_FIELDS } from "@/domain/menu/translationStatus";
export type { TranslationEntityType, TranslationField };

export type TranslationRow = {
  entityType: TranslationEntityType;
  entityId: string;
  field: TranslationField;
  locale: MenuLocale;
  value: string;
  /**
   * Hash du texte source au moment de la traduction (cf. `textHash.ts`).
   * `null` sur les lignes legacy/migrées ⇒ statut `stale` conservateur.
   */
  sourceTextHash: string | null;
};

/**
 * Accès direct aux lignes de traduction (S4) pour l'aperçu de couverture et
 * l'auto-traduction. Les lectures/écritures « par entité » (items, plats du jour…)
 * restent dans `MenuRepository` ; ce port travaille en masse, par restaurant.
 */
export interface TranslationRepository {
  /** Toutes les lignes du restaurant (locales normalisées en minuscules). */
  listForRestaurant(restaurantId: string): Promise<TranslationRow[]>;

  /**
   * Upsert en masse. Une `value` vide ⇒ suppression de la ligne (sémantique
   * « missing », jamais de ligne vide en base). ⚠️ L'appelant DOIT avoir validé
   * que chaque `entityId` appartient bien au restaurant (cf. `AutoTranslateMenu`) —
   * l'implémentation refuse en plus de réécrire une ligne d'un autre restaurant.
   */
  upsertMany(params: { restaurantId: string; rows: TranslationRow[] }): Promise<void>;
}
