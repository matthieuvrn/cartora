import type { MenuOverview } from "@/domain/menu/MenuTypes";
import type { Allergen, ItemBadge } from "@/domain/menu/ItemPolicy";

export type DuplicateCategoryNameError = Error & { code: "duplicate_name" };

export function isDuplicateCategoryNameError(e: unknown): e is DuplicateCategoryNameError {
  return e instanceof Error && (e as { code?: string }).code === "duplicate_name";
}

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
    translations: {
      fr: { name: string; description: string };
      en: { name: string; description: string };
    };
  }): Promise<{ id: string }>;

  updateItem(params: {
    itemId: string;
    restaurantId: string;
    priceCents: number;
    badge: ItemBadge;
    allergens: Allergen[];
    isAvailable: boolean;
    translations: {
      fr: { name: string; description: string };
      en: { name: string; description: string };
    };
  }): Promise<void>;

  deleteItem(params: { itemId: string; restaurantId: string }): Promise<void>;

  /** Returns null if the item does not exist or does not belong to the restaurant. */
  getItem(params: {
    itemId: string;
    restaurantId: string;
  }): Promise<{ imagePath: string | null } | null>;

  updateItemImage(params: {
    itemId: string;
    restaurantId: string;
    imagePath: string | null;
    altTextFr: string | null;
    altTextEn: string | null;
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
}
