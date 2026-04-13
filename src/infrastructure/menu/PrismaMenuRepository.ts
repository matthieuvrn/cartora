import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { MenuOverview, MenuItemData, ItemTranslations } from "@/domain/menu/MenuTypes";
import type { ItemBadge } from "@/domain/menu/ItemPolicy";
import type { PrismaClient } from "@/generated/prisma/client";

export class PrismaMenuRepository implements MenuRepository {
  constructor(private readonly db: PrismaClient) {}

  async getMenuByRestaurantId(restaurantId: string): Promise<MenuOverview | null> {
    const menu = await this.db.menu.findUnique({
      where: { restaurantId },
      select: {
        id: true,
        restaurantId: true,
        status: true,
        publishedAt: true,
        categories: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            type: true,
            order: true,
            items: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                priceCents: true,
                badge: true,
                isAvailable: true,
                order: true,
              },
            },
          },
        },
      },
    });

    if (!menu) return null;

    // All ITEM translations for the restaurant in a single query (no N+1)
    const translations = await this.db.translation.findMany({
      where: { restaurantId, entityType: "ITEM" },
      select: {
        entityId: true,
        field: true,
        locale: true,
        value: true,
      },
    });

    // Indexer par entityId → locale → field
    const translationMap = new Map<string, Map<string, Map<string, string>>>();
    for (const t of translations) {
      let byLocale = translationMap.get(t.entityId);
      if (!byLocale) {
        byLocale = new Map();
        translationMap.set(t.entityId, byLocale);
      }
      let byField = byLocale.get(t.locale);
      if (!byField) {
        byField = new Map();
        byLocale.set(t.locale, byField);
      }
      byField.set(t.field, t.value);
    }

    return {
      menuId: menu.id,
      restaurantId: menu.restaurantId,
      status: menu.status,
      publishedAt: menu.publishedAt?.toISOString() ?? null,
      categories: menu.categories.map((cat) => ({
        id: cat.id,
        type: cat.type,
        order: cat.order,
        items: cat.items.map(
          (item): MenuItemData => ({
            id: item.id,
            priceCents: item.priceCents,
            badge: item.badge as ItemBadge,
            isAvailable: item.isAvailable,
            order: item.order,
            translations: {
              fr: getItemTranslations(translationMap, item.id, "FR"),
              en: getItemTranslations(translationMap, item.id, "EN"),
            },
          }),
        ),
      })),
    };
  }

  async verifyCategoryOwnership(categoryId: string, restaurantId: string): Promise<boolean> {
    const category = await this.db.category.findFirst({
      where: { id: categoryId, restaurantId },
      select: { id: true },
    });
    return category !== null;
  }

  async createItem(params: Parameters<MenuRepository["createItem"]>[0]): Promise<{ id: string }> {
    return this.db.$transaction(async (tx) => {
      const category = await tx.category.findFirst({
        where: { id: params.categoryId, restaurantId: params.restaurantId },
        select: { id: true },
      });
      if (!category) throw new Error("Category does not belong to this restaurant");

      const item = await tx.item.create({
        data: {
          categoryId: params.categoryId,
          restaurantId: params.restaurantId,
          priceCents: params.priceCents,
          badge: params.badge,
          isAvailable: params.isAvailable,
          order: params.order,
        },
        select: { id: true },
      });

      await tx.translation.createMany({
        data: [
          {
            entityType: "ITEM",
            entityId: item.id,
            field: "name",
            locale: "FR",
            value: params.translations.fr.name,
            restaurantId: params.restaurantId,
          },
          {
            entityType: "ITEM",
            entityId: item.id,
            field: "description",
            locale: "FR",
            value: params.translations.fr.description,
            restaurantId: params.restaurantId,
          },
          {
            entityType: "ITEM",
            entityId: item.id,
            field: "name",
            locale: "EN",
            value: params.translations.en.name,
            restaurantId: params.restaurantId,
          },
          {
            entityType: "ITEM",
            entityId: item.id,
            field: "description",
            locale: "EN",
            value: params.translations.en.description,
            restaurantId: params.restaurantId,
          },
        ],
      });

      return item;
    });
  }

  async updateItem(params: Parameters<MenuRepository["updateItem"]>[0]): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.item.update({
        where: { id: params.itemId, restaurantId: params.restaurantId },
        data: {
          priceCents: params.priceCents,
          badge: params.badge,
          isAvailable: params.isAvailable,
        },
      });

      const upserts = [
        { field: "name", locale: "FR" as const, value: params.translations.fr.name },
        { field: "description", locale: "FR" as const, value: params.translations.fr.description },
        { field: "name", locale: "EN" as const, value: params.translations.en.name },
        { field: "description", locale: "EN" as const, value: params.translations.en.description },
      ];

      for (const u of upserts) {
        await tx.translation.upsert({
          where: {
            entityType_entityId_field_locale: {
              entityType: "ITEM",
              entityId: params.itemId,
              field: u.field,
              locale: u.locale,
            },
          },
          update: { value: u.value },
          create: {
            entityType: "ITEM",
            entityId: params.itemId,
            field: u.field,
            locale: u.locale,
            value: u.value,
            restaurantId: params.restaurantId,
          },
        });
      }
    });
  }

  async deleteItem(params: { itemId: string; restaurantId: string }): Promise<void> {
    const { itemId, restaurantId } = params;
    await this.db.$transaction(async (tx) => {
      await tx.translation.deleteMany({
        where: { entityType: "ITEM", entityId: itemId, restaurantId },
      });

      await tx.item.delete({
        where: { id: itemId, restaurantId },
      });
    });
  }

  async reorderItems(params: {
    categoryId: string;
    restaurantId: string;
    itemIds: string[];
  }): Promise<void> {
    const { categoryId, restaurantId, itemIds } = params;
    await this.db.$transaction(async (tx) => {
      const category = await tx.category.findFirst({
        where: { id: categoryId, restaurantId },
        select: { id: true },
      });
      if (!category) throw new Error("Category does not belong to this restaurant");

      for (const [index, id] of itemIds.entries()) {
        await tx.item.update({
          where: { id, categoryId, restaurantId },
          data: { order: index },
        });
      }
    });
  }

  async getNextItemOrder(categoryId: string): Promise<number> {
    return this.db.item.count({ where: { categoryId } });
  }

  async markMenuAsDraft(restaurantId: string): Promise<void> {
    await this.db.menu.update({
      where: { restaurantId },
      data: { status: "DRAFT" },
    });
  }

  async updateMenuStatus(params: {
    menuId: string;
    status: "DRAFT" | "PUBLISHED";
    publishedAt: string;
  }): Promise<void> {
    const { menuId, status, publishedAt } = params;
    await this.db.menu.update({
      where: { id: menuId },
      data: { status, publishedAt: new Date(publishedAt) },
    });
  }
}

function getItemTranslations(
  map: Map<string, Map<string, Map<string, string>>>,
  itemId: string,
  locale: string,
): ItemTranslations {
  const byField = map.get(itemId)?.get(locale);
  return {
    name: byField?.get("name") ?? "",
    description: byField?.get("description") ?? "",
  };
}
