import type { MenuOverview } from "@/domain/menu/MenuTypes";
import type { ItemBadge } from "@/domain/menu/ItemPolicy";

export interface MenuRepository {
  getMenuByRestaurantId(restaurantId: string): Promise<MenuOverview | null>;

  createItem(params: {
    categoryId: string;
    restaurantId: string;
    priceCents: number;
    badge: ItemBadge;
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
    isAvailable: boolean;
    translations: {
      fr: { name: string; description: string };
      en: { name: string; description: string };
    };
  }): Promise<void>;

  deleteItem(params: { itemId: string; restaurantId: string }): Promise<void>;

  reorderItems(params: {
    categoryId: string;
    restaurantId: string;
    itemIds: string[];
  }): Promise<void>;

  getNextItemOrder(categoryId: string): Promise<number>;

  updateMenuStatus(params: {
    menuId: string;
    status: "DRAFT" | "PUBLISHED";
    publishedAt: string;
  }): Promise<void>;

  markMenuAsDraft(restaurantId: string): Promise<void>;
}
