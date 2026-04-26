import type { InitialCategory } from "@/domain/restaurant/RestaurantInitPolicy";
import type { Allergen, ItemBadge } from "./ItemPolicy";

export type CategoryType = InitialCategory["type"];

export type ItemTranslations = {
  name: string;
  description: string;
};

export type MenuItemData = {
  id: string;
  priceCents: number;
  badge: ItemBadge;
  allergens: Allergen[];
  isAvailable: boolean;
  order: number;
  translations: { fr: ItemTranslations; en: ItemTranslations };
};

export type MenuCategoryData = {
  id: string;
  type: CategoryType;
  order: number;
  items: MenuItemData[];
};

export type MenuOverview = {
  menuId: string;
  restaurantId: string;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  categories: MenuCategoryData[];
};
