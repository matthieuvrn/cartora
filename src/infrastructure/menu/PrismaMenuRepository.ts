import type { MenuRepository } from "@/application/ports/MenuRepository";
import type {
  DailyDishData,
  FormulaData,
  MenuOverview,
  MenuItemData,
  ItemTranslations,
  MenuTemplate,
} from "@/domain/menu/MenuTypes";
import type { Allergen, ItemBadge } from "@/domain/menu/ItemPolicy";
import type { PrismaClient } from "@/generated/prisma/client";
import { DomainError } from "@/domain/errors/DomainError";

export class PrismaMenuRepository implements MenuRepository {
  constructor(private readonly db: PrismaClient) {}

  async getMenuByRestaurantId(restaurantId: string): Promise<MenuOverview | null> {
    const menu = await this.db.menu.findUnique({
      where: { restaurantId },
      select: {
        id: true,
        restaurantId: true,
        status: true,
        template: true,
        publishedAt: true,
        categories: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            order: true,
            items: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                priceCents: true,
                badge: true,
                allergens: true,
                isAvailable: true,
                imagePath: true,
                altTextFr: true,
                altTextEn: true,
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
      template: menu.template as MenuTemplate,
      publishedAt: menu.publishedAt?.toISOString() ?? null,
      categories: menu.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        order: cat.order,
        items: cat.items.map(
          (item): MenuItemData => ({
            id: item.id,
            priceCents: item.priceCents,
            badge: item.badge as ItemBadge,
            allergens: item.allergens as Allergen[],
            isAvailable: item.isAvailable,
            imagePath: item.imagePath,
            altTextFr: item.altTextFr,
            altTextEn: item.altTextEn,
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
          allergens: params.allergens,
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
          allergens: { set: params.allergens },
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

  async getItem(params: {
    itemId: string;
    restaurantId: string;
  }): Promise<{ imagePath: string | null } | null> {
    const item = await this.db.item.findFirst({
      where: { id: params.itemId, restaurantId: params.restaurantId },
      select: { imagePath: true },
    });
    return item;
  }

  async updateItemImage(params: {
    itemId: string;
    restaurantId: string;
    imagePath: string | null;
    altTextFr: string | null;
    altTextEn: string | null;
  }): Promise<void> {
    await this.db.item.update({
      where: { id: params.itemId, restaurantId: params.restaurantId },
      data: {
        imagePath: params.imagePath,
        altTextFr: params.altTextFr,
        altTextEn: params.altTextEn,
      },
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

  async updateTemplate(params: { restaurantId: string; template: MenuTemplate }): Promise<void> {
    await this.db.menu.update({
      where: { restaurantId: params.restaurantId },
      data: { template: params.template },
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

  // ─ Catégories ──────────────────────────────────────────────────────────────

  async verifyMenuOwnership(menuId: string, restaurantId: string): Promise<boolean> {
    const menu = await this.db.menu.findFirst({
      where: { id: menuId, restaurantId },
      select: { id: true },
    });
    return menu !== null;
  }

  async getMenuIdByRestaurantId(restaurantId: string): Promise<string | null> {
    const menu = await this.db.menu.findUnique({
      where: { restaurantId },
      select: { id: true },
    });
    return menu?.id ?? null;
  }

  async countItemsWithImage(restaurantId: string): Promise<number> {
    return this.db.item.count({
      where: { restaurantId, imagePath: { not: null } },
    });
  }

  async listCategoryNames(menuId: string): Promise<{ id: string; name: string }[]> {
    return this.db.category.findMany({
      where: { menuId },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    });
  }

  async createCategory(params: {
    menuId: string;
    restaurantId: string;
    name: string;
    order: number;
  }): Promise<{ id: string }> {
    try {
      return await this.db.category.create({
        data: {
          menuId: params.menuId,
          restaurantId: params.restaurantId,
          name: params.name,
          order: params.order,
        },
        select: { id: true },
      });
    } catch (e) {
      throw mapDuplicateNameError(e);
    }
  }

  async renameCategory(params: {
    categoryId: string;
    restaurantId: string;
    name: string;
  }): Promise<void> {
    try {
      await this.db.category.update({
        where: { id: params.categoryId, restaurantId: params.restaurantId },
        data: { name: params.name },
      });
    } catch (e) {
      throw mapDuplicateNameError(e);
    }
  }

  async deleteCategory(params: { categoryId: string; restaurantId: string }): Promise<void> {
    await this.db.category.delete({
      where: { id: params.categoryId, restaurantId: params.restaurantId },
    });
  }

  async reorderCategories(params: {
    menuId: string;
    restaurantId: string;
    orderedIds: string[];
  }): Promise<void> {
    const { menuId, restaurantId, orderedIds } = params;
    await this.db.$transaction(async (tx) => {
      for (const [index, id] of orderedIds.entries()) {
        await tx.category.update({
          where: { id, menuId, restaurantId },
          data: { order: index },
        });
      }
    });
  }

  // ─ Menu du jour (S3.1) ─────────────────────────────────────────────────────

  async listDailyDishes(restaurantId: string): Promise<DailyDishData[]> {
    const rows = await this.db.dailyDish.findMany({
      where: { restaurantId },
      orderBy: { order: "asc" },
    });
    return rows.map(
      (row): DailyDishData => ({
        id: row.id,
        priceCents: row.priceCents,
        badge: row.badge as ItemBadge,
        allergens: row.allergens as Allergen[],
        imagePath: row.imagePath,
        altTextFr: row.altTextFr,
        altTextEn: row.altTextEn,
        validUntilISO: row.validUntil.toISOString(),
        order: row.order,
        translations: {
          fr: { name: row.nameFr, description: row.descriptionFr },
          en: { name: row.nameEn, description: row.descriptionEn },
        },
      }),
    );
  }

  async getDailyDish(params: {
    dishId: string;
    restaurantId: string;
  }): Promise<{ imagePath: string | null } | null> {
    const row = await this.db.dailyDish.findFirst({
      where: { id: params.dishId, restaurantId: params.restaurantId },
      select: { imagePath: true },
    });
    return row;
  }

  async createDailyDish(
    params: Parameters<MenuRepository["createDailyDish"]>[0],
  ): Promise<{ id: string }> {
    const entry = await this.db.dailyDish.create({
      data: {
        restaurantId: params.restaurantId,
        menuId: params.menuId,
        priceCents: params.priceCents,
        badge: params.badge,
        allergens: params.allergens,
        validUntil: new Date(params.validUntilISO),
        order: params.order,
        nameFr: params.translations.fr.name,
        descriptionFr: params.translations.fr.description,
        nameEn: params.translations.en.name,
        descriptionEn: params.translations.en.description,
      },
      select: { id: true },
    });
    return entry;
  }

  async updateDailyDish(params: Parameters<MenuRepository["updateDailyDish"]>[0]): Promise<void> {
    await this.db.dailyDish.update({
      where: { id: params.dishId, restaurantId: params.restaurantId },
      data: {
        priceCents: params.priceCents,
        badge: params.badge,
        allergens: { set: params.allergens },
        validUntil: new Date(params.validUntilISO),
        nameFr: params.translations.fr.name,
        descriptionFr: params.translations.fr.description,
        nameEn: params.translations.en.name,
        descriptionEn: params.translations.en.description,
      },
    });
  }

  async updateDailyDishImage(params: {
    dishId: string;
    restaurantId: string;
    imagePath: string | null;
    altTextFr: string | null;
    altTextEn: string | null;
  }): Promise<void> {
    await this.db.dailyDish.update({
      where: { id: params.dishId, restaurantId: params.restaurantId },
      data: {
        imagePath: params.imagePath,
        altTextFr: params.altTextFr,
        altTextEn: params.altTextEn,
      },
    });
  }

  async deleteDailyDish(params: { dishId: string; restaurantId: string }): Promise<void> {
    await this.db.dailyDish.delete({
      where: { id: params.dishId, restaurantId: params.restaurantId },
    });
  }

  async reorderDailyDishes(params: { restaurantId: string; orderedIds: string[] }): Promise<void> {
    const { restaurantId, orderedIds } = params;
    await this.db.$transaction(async (tx) => {
      for (const [index, id] of orderedIds.entries()) {
        await tx.dailyDish.update({
          where: { id, restaurantId },
          data: { order: index },
        });
      }
    });
  }

  async getNextDailyDishOrder(restaurantId: string): Promise<number> {
    return this.db.dailyDish.count({ where: { restaurantId } });
  }

  // ─ Formules (S3.2) ─────────────────────────────────────────────────────────

  async listFormulas(restaurantId: string): Promise<FormulaData[]> {
    const rows = await this.db.formula.findMany({
      where: { restaurantId },
      orderBy: { order: "asc" },
    });
    return rows.map(
      (row): FormulaData => ({
        id: row.id,
        priceCents: row.priceCents,
        validUntilISO: row.validUntil.toISOString(),
        order: row.order,
        translations: {
          fr: { name: row.nameFr, description: row.descriptionFr },
          en: { name: row.nameEn, description: row.descriptionEn },
        },
      }),
    );
  }

  async getFormula(params: {
    formulaId: string;
    restaurantId: string;
  }): Promise<{ id: string } | null> {
    const row = await this.db.formula.findFirst({
      where: { id: params.formulaId, restaurantId: params.restaurantId },
      select: { id: true },
    });
    return row;
  }

  async createFormula(
    params: Parameters<MenuRepository["createFormula"]>[0],
  ): Promise<{ id: string }> {
    const formula = await this.db.formula.create({
      data: {
        restaurantId: params.restaurantId,
        menuId: params.menuId,
        priceCents: params.priceCents,
        validUntil: new Date(params.validUntilISO),
        order: params.order,
        nameFr: params.translations.fr.name,
        descriptionFr: params.translations.fr.description,
        nameEn: params.translations.en.name,
        descriptionEn: params.translations.en.description,
      },
      select: { id: true },
    });
    return formula;
  }

  async updateFormula(params: Parameters<MenuRepository["updateFormula"]>[0]): Promise<void> {
    await this.db.formula.update({
      where: { id: params.formulaId, restaurantId: params.restaurantId },
      data: {
        priceCents: params.priceCents,
        validUntil: new Date(params.validUntilISO),
        nameFr: params.translations.fr.name,
        descriptionFr: params.translations.fr.description,
        nameEn: params.translations.en.name,
        descriptionEn: params.translations.en.description,
      },
    });
  }

  async deleteFormula(params: { formulaId: string; restaurantId: string }): Promise<void> {
    await this.db.formula.delete({
      where: { id: params.formulaId, restaurantId: params.restaurantId },
    });
  }

  async reorderFormulas(params: { restaurantId: string; orderedIds: string[] }): Promise<void> {
    const { restaurantId, orderedIds } = params;
    await this.db.$transaction(async (tx) => {
      for (const [index, id] of orderedIds.entries()) {
        await tx.formula.update({
          where: { id, restaurantId },
          data: { order: index },
        });
      }
    });
  }

  async getNextFormulaOrder(restaurantId: string): Promise<number> {
    return this.db.formula.count({ where: { restaurantId } });
  }
}

/**
 * Mappe une violation d'unicité Postgres (code 23505) ou Prisma (P2002) vers une `DomainError`
 * avec code `"duplicate_name"`, consommable par les use cases / actions.
 */
function mapDuplicateNameError(e: unknown): Error {
  const isPrismaUnique = e instanceof Error && (e as { code?: string }).code === "P2002";
  const isPgUnique =
    e instanceof Error && /23505|categories_menu_id_name_lower_idx/.test(e.message);
  if (isPrismaUnique || isPgUnique) {
    return new DomainError("duplicate_name", { field: "name" });
  }
  return e instanceof Error ? e : new Error(String(e));
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
