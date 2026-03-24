import type { InitialCategory } from "@/domain/restaurant/RestaurantInitPolicy";
import type { ItemBadge } from "./ItemPolicy";

export type CategoryType = InitialCategory["type"];

export type ItemTranslations = {
  name: string;
  description: string;
};

export type MenuItemData = {
  id: string;
  priceCents: number;
  badge: ItemBadge;
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
  categories: MenuCategoryData[];
};
