import type {
  DailyDishData,
  FormulaData,
  MenuOverview,
  MenuTemplate,
} from "@/domain/menu/MenuTypes";
import type { Allergen, ItemBadge } from "@/domain/menu/ItemPolicy";
import type { MenuLocale } from "@/domain/menu/MenuLocale";

// Note : la détection des collisions de nom passe désormais par
// `isDomainError(e) && e.code === "duplicate_name"` depuis `@/domain/errors/DomainError`.
// L'ancien helper `isDuplicateCategoryNameError` a été supprimé en Phase E.
//
// S4 (multilingue) : les écritures de contenu portent UNIQUEMENT la langue source
// (`sourceLocale` + `texts`). Les traductions cibles vivent dans `TranslationRepository`
// (écran de revue, auto-traduction) et ne sont jamais touchées par ces méthodes —
// modifier le texte source les invalide automatiquement (hash, cf. translationStatus).

export interface MenuRepository {
  getMenuByRestaurantId(restaurantId: string): Promise<MenuOverview | null>;

  createItem(params: {
    categoryId: string;
    restaurantId: string;
    priceCents: number;
    badge: ItemBadge;
    allergens: Allergen[];
    isAvailable: boolean;
    order: number;
    sourceLocale: MenuLocale;
    texts: { name: string; description: string };
  }): Promise<{ id: string }>;

  updateItem(params: {
    itemId: string;
    restaurantId: string;
    priceCents: number;
    badge: ItemBadge;
    allergens: Allergen[];
    isAvailable: boolean;
    sourceLocale: MenuLocale;
    texts: { name: string; description: string };
  }): Promise<void>;

  deleteItem(params: { itemId: string; restaurantId: string }): Promise<void>;

  /** Returns null if the item does not exist or does not belong to the restaurant. */
  getItem(params: {
    itemId: string;
    restaurantId: string;
  }): Promise<{ imagePath: string | null } | null>;

  /**
   * `imagePath: null` (suppression de photo) efface aussi les alt-texts de TOUTES
   * les locales ; sinon, seul l'alt-text de la langue source est écrit.
   */
  updateItemImage(params: {
    itemId: string;
    restaurantId: string;
    imagePath: string | null;
    sourceLocale: MenuLocale;
    altText: string | null;
  }): Promise<void>;

  reorderItems(params: {
    categoryId: string;
    restaurantId: string;
    itemIds: string[];
  }): Promise<void>;

  verifyCategoryOwnership(categoryId: string, restaurantId: string): Promise<boolean>;

  verifyMenuOwnership(menuId: string, restaurantId: string): Promise<boolean>;

  getNextItemOrder(categoryId: string): Promise<number>;

  updateMenuStatus(params: {
    menuId: string;
    status: "DRAFT" | "PUBLISHED";
    publishedAt: string;
  }): Promise<void>;

  markMenuAsDraft(restaurantId: string): Promise<void>;

  /**
   * Met à jour le template de rendu choisi pour le menu du restaurant.
   * Le gating tier (CLASSIC libre / templates premium PRO only) est vérifié
   * en amont par le use case via `PlanPolicy.canUseTemplate`.
   */
  updateTemplate(params: { restaurantId: string; template: MenuTemplate }): Promise<void>;

  // ─ Catégories ──────────────────────────────────────────────────────────────

  /** Liste { id, name } des catégories du menu, ordonnées par `order`. */
  listCategoryNames(menuId: string): Promise<{ id: string; name: string }[]>;

  /**
   * Crée une catégorie. `order` doit être passé par l'appelant (en général = count).
   * Lève une erreur avec `code: "duplicate_name"` si le nom (lower(btrim)) existe déjà dans le menu.
   */
  createCategory(params: {
    menuId: string;
    restaurantId: string;
    name: string;
    order: number;
  }): Promise<{ id: string }>;

  /** Lève une erreur avec `code: "duplicate_name"` en cas de collision. */
  renameCategory(params: { categoryId: string; restaurantId: string; name: string }): Promise<void>;

  deleteCategory(params: { categoryId: string; restaurantId: string }): Promise<void>;

  reorderCategories(params: {
    menuId: string;
    restaurantId: string;
    orderedIds: string[];
  }): Promise<void>;

  /** Récupère le menuId d'un restaurant (pour les actions catégories qui n'ont que restaurantId). */
  getMenuIdByRestaurantId(restaurantId: string): Promise<string | null>;

  /** Nombre d'items du restaurant qui ont une `imagePath` non-null (utilisé pour le paywall photos). */
  countItemsWithImage(restaurantId: string): Promise<number>;

  // ─ Menu du jour (S3.1) ─────────────────────────────────────────────────────

  /**
   * Liste TOUTES les daily entries du restaurant, triées par `order` croissant.
   * Le filtrage `validUntil > now()` n'est PAS fait ici — l'appelant (use case)
   * passe le résultat à `DailyDishPolicy.isActive` avec un `Clock` injecté.
   */
  listDailyDishes(restaurantId: string): Promise<DailyDishData[]>;

  /** Retourne null si l'entrée n'existe pas ou ne lui appartient pas. */
  getDailyDish(params: {
    dishId: string;
    restaurantId: string;
  }): Promise<{ imagePath: string | null } | null>;

  createDailyDish(params: {
    restaurantId: string;
    menuId: string;
    priceCents: number;
    badge: ItemBadge;
    allergens: Allergen[];
    validUntilISO: string;
    order: number;
    sourceLocale: MenuLocale;
    texts: { name: string; description: string };
  }): Promise<{ id: string }>;

  updateDailyDish(params: {
    dishId: string;
    restaurantId: string;
    priceCents: number;
    badge: ItemBadge;
    allergens: Allergen[];
    validUntilISO: string;
    sourceLocale: MenuLocale;
    texts: { name: string; description: string };
  }): Promise<void>;

  /** Cf. `updateItemImage` : `imagePath: null` efface les alt-texts de toutes les locales. */
  updateDailyDishImage(params: {
    dishId: string;
    restaurantId: string;
    imagePath: string | null;
    sourceLocale: MenuLocale;
    altText: string | null;
  }): Promise<void>;

  deleteDailyDish(params: { dishId: string; restaurantId: string }): Promise<void>;

  reorderDailyDishes(params: { restaurantId: string; orderedIds: string[] }): Promise<void>;

  /** Nombre de daily entries du restaurant — utilisé pour l'ordre d'insertion. */
  getNextDailyDishOrder(restaurantId: string): Promise<number>;

  // ─ Formules (S3.2) ─────────────────────────────────────────────────────────

  /**
   * Liste TOUTES les formules du restaurant, triées par `order` croissant.
   * Pas de filtrage `validUntil > now()` ici — le use case applique
   * `FormulaPolicy.isActive` avec un `Clock` injecté (cf. daily entries).
   */
  listFormulas(restaurantId: string): Promise<FormulaData[]>;

  /** Retourne null si la formule n'existe pas ou ne lui appartient pas. */
  getFormula(params: { formulaId: string; restaurantId: string }): Promise<{ id: string } | null>;

  createFormula(params: {
    restaurantId: string;
    menuId: string;
    priceCents: number;
    validUntilISO: string;
    order: number;
    sourceLocale: MenuLocale;
    texts: { name: string; description: string };
  }): Promise<{ id: string }>;

  updateFormula(params: {
    formulaId: string;
    restaurantId: string;
    priceCents: number;
    validUntilISO: string;
    sourceLocale: MenuLocale;
    texts: { name: string; description: string };
  }): Promise<void>;

  deleteFormula(params: { formulaId: string; restaurantId: string }): Promise<void>;

  reorderFormulas(params: { restaurantId: string; orderedIds: string[] }): Promise<void>;

  /** Nombre de formules du restaurant — utilisé pour l'ordre d'insertion. */
  getNextFormulaOrder(restaurantId: string): Promise<number>;
}
