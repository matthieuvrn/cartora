import type { MenuRepository } from "@/application/ports/MenuRepository";
import type {
  DailyDishData,
  FormulaData,
  MenuOverview,
  MenuItemData,
  MenuTemplate,
} from "@/domain/menu/MenuTypes";
import type { Allergen, ItemBadge } from "@/domain/menu/ItemPolicy";
import { isMenuLocale, type LocalizedText, type MenuLocale } from "@/domain/menu/MenuLocale";
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
        restaurant: { select: { sourceLocale: true, menuLocales: true } },
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
                order: true,
              },
            },
          },
        },
      },
    });

    if (!menu) return null;

    // Toutes les traductions du restaurant (tous entity types) en une requête (no N+1).
    const translations = await this.db.translation.findMany({
      where: { restaurantId },
      select: {
        entityType: true,
        entityId: true,
        field: true,
        locale: true,
        value: true,
      },
    });
    const index = indexTranslations(translations);
    const sourceLocale = menu.restaurant.sourceLocale as MenuLocale;

    return {
      menuId: menu.id,
      restaurantId: menu.restaurantId,
      status: menu.status,
      template: menu.template as MenuTemplate,
      publishedAt: menu.publishedAt?.toISOString() ?? null,
      sourceLocale,
      enabledLocales: menu.restaurant.menuLocales as MenuLocale[],
      categories: menu.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        // La colonne `name` (langue source) prime sur une éventuelle ligne parasite.
        nameTexts: {
          ...localizedTextOf(index, "CATEGORY", cat.id, "name"),
          [sourceLocale]: cat.name,
        },
        order: cat.order,
        items: cat.items.map((item): MenuItemData => {
          const name = localizedTextOf(index, "ITEM", item.id, "name");
          const description = localizedTextOf(index, "ITEM", item.id, "description");
          return {
            id: item.id,
            priceCents: item.priceCents,
            badge: item.badge as ItemBadge,
            allergens: item.allergens as Allergen[],
            isAvailable: item.isAvailable,
            order: item.order,
            translations: {
              fr: { name: name.fr ?? "", description: description.fr ?? "" },
              en: { name: name.en ?? "", description: description.en ?? "" },
            },
            texts: { name, description },
          };
        }),
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

      // Valeur vide ⇒ pas de ligne (sémantique « missing ») — jamais de ligne vide en base.
      const rows = [
        { field: "name", locale: params.sourceLocale, value: params.texts.name },
        { field: "description", locale: params.sourceLocale, value: params.texts.description },
      ]
        .filter((t) => t.value.trim() !== "")
        .map((t) => ({
          entityType: "ITEM",
          entityId: item.id,
          restaurantId: params.restaurantId,
          ...t,
        }));
      if (rows.length > 0) {
        await tx.translation.createMany({ data: rows });
      }

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

      // Seule la langue source est écrite — les lignes cibles restent intactes
      // (leur hash devient obsolète ⇒ statut stale, cf. translationStatus).
      await upsertEntityTexts(tx, {
        entityType: "ITEM",
        entityId: params.itemId,
        restaurantId: params.restaurantId,
        upserts: [
          { field: "name", locale: params.sourceLocale, value: params.texts.name },
          { field: "description", locale: params.sourceLocale, value: params.texts.description },
        ],
      });
    });
  }

  async getItem(params: { itemId: string; restaurantId: string }): Promise<{ id: string } | null> {
    const item = await this.db.item.findFirst({
      where: { id: params.itemId, restaurantId: params.restaurantId },
      select: { id: true },
    });
    return item;
  }

  async updateItemAvailability(params: {
    itemId: string;
    restaurantId: string;
    isAvailable: boolean;
  }): Promise<void> {
    await this.db.item.update({
      where: { id: params.itemId, restaurantId: params.restaurantId },
      data: { isAvailable: params.isAvailable },
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
    await this.db.$transaction(async (tx) => {
      await tx.translation.deleteMany({
        where: {
          entityType: "CATEGORY",
          entityId: params.categoryId,
          restaurantId: params.restaurantId,
        },
      });
      await tx.category.delete({
        where: { id: params.categoryId, restaurantId: params.restaurantId },
      });
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
    const translations = await this.db.translation.findMany({
      where: { restaurantId, entityType: "DAILY_DISH" },
      select: { entityType: true, entityId: true, field: true, locale: true, value: true },
    });
    const index = indexTranslations(translations);

    return rows.map((row): DailyDishData => {
      const name = localizedTextOf(index, "DAILY_DISH", row.id, "name");
      const description = localizedTextOf(index, "DAILY_DISH", row.id, "description");
      return {
        id: row.id,
        priceCents: row.priceCents,
        badge: row.badge as ItemBadge,
        allergens: row.allergens as Allergen[],
        validUntilISO: row.validUntil.toISOString(),
        order: row.order,
        translations: {
          fr: { name: name.fr ?? "", description: description.fr ?? "" },
          en: { name: name.en ?? "", description: description.en ?? "" },
        },
        texts: { name, description },
      };
    });
  }

  async getDailyDish(params: {
    dishId: string;
    restaurantId: string;
  }): Promise<{ id: string } | null> {
    const row = await this.db.dailyDish.findFirst({
      where: { id: params.dishId, restaurantId: params.restaurantId },
      select: { id: true },
    });
    return row;
  }

  async createDailyDish(
    params: Parameters<MenuRepository["createDailyDish"]>[0],
  ): Promise<{ id: string }> {
    // Texte source écrit dans `translations` (langue source) ; cibles jamais touchées ici.
    return this.db.$transaction(async (tx) => {
      const entry = await tx.dailyDish.create({
        data: {
          restaurantId: params.restaurantId,
          menuId: params.menuId,
          priceCents: params.priceCents,
          badge: params.badge,
          allergens: params.allergens,
          validUntil: new Date(params.validUntilISO),
          order: params.order,
        },
        select: { id: true },
      });

      await upsertEntityTexts(tx, {
        entityType: "DAILY_DISH",
        entityId: entry.id,
        restaurantId: params.restaurantId,
        upserts: [
          { field: "name", locale: params.sourceLocale, value: params.texts.name },
          { field: "description", locale: params.sourceLocale, value: params.texts.description },
        ],
      });

      return entry;
    });
  }

  async updateDailyDish(params: Parameters<MenuRepository["updateDailyDish"]>[0]): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.dailyDish.update({
        where: { id: params.dishId, restaurantId: params.restaurantId },
        data: {
          priceCents: params.priceCents,
          badge: params.badge,
          allergens: { set: params.allergens },
          validUntil: new Date(params.validUntilISO),
        },
      });

      await upsertEntityTexts(tx, {
        entityType: "DAILY_DISH",
        entityId: params.dishId,
        restaurantId: params.restaurantId,
        upserts: [
          { field: "name", locale: params.sourceLocale, value: params.texts.name },
          { field: "description", locale: params.sourceLocale, value: params.texts.description },
        ],
      });
    });
  }

  async deleteDailyDish(params: { dishId: string; restaurantId: string }): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.translation.deleteMany({
        where: {
          entityType: "DAILY_DISH",
          entityId: params.dishId,
          restaurantId: params.restaurantId,
        },
      });
      await tx.dailyDish.delete({
        where: { id: params.dishId, restaurantId: params.restaurantId },
      });
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
    const translations = await this.db.translation.findMany({
      where: { restaurantId, entityType: "FORMULA" },
      select: { entityType: true, entityId: true, field: true, locale: true, value: true },
    });
    const index = indexTranslations(translations);

    return rows.map((row): FormulaData => {
      const name = localizedTextOf(index, "FORMULA", row.id, "name");
      const description = localizedTextOf(index, "FORMULA", row.id, "description");
      return {
        id: row.id,
        priceCents: row.priceCents,
        validUntilISO: row.validUntil.toISOString(),
        order: row.order,
        translations: {
          fr: { name: name.fr ?? "", description: description.fr ?? "" },
          en: { name: name.en ?? "", description: description.en ?? "" },
        },
        texts: { name, description },
      };
    });
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
    // Texte source écrit dans `translations` (langue source) ; cibles jamais touchées ici.
    return this.db.$transaction(async (tx) => {
      const formula = await tx.formula.create({
        data: {
          restaurantId: params.restaurantId,
          menuId: params.menuId,
          priceCents: params.priceCents,
          validUntil: new Date(params.validUntilISO),
          order: params.order,
        },
        select: { id: true },
      });

      await upsertEntityTexts(tx, {
        entityType: "FORMULA",
        entityId: formula.id,
        restaurantId: params.restaurantId,
        upserts: [
          { field: "name", locale: params.sourceLocale, value: params.texts.name },
          { field: "description", locale: params.sourceLocale, value: params.texts.description },
        ],
      });

      return formula;
    });
  }

  async updateFormula(params: Parameters<MenuRepository["updateFormula"]>[0]): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.formula.update({
        where: { id: params.formulaId, restaurantId: params.restaurantId },
        data: {
          priceCents: params.priceCents,
          validUntil: new Date(params.validUntilISO),
        },
      });

      await upsertEntityTexts(tx, {
        entityType: "FORMULA",
        entityId: params.formulaId,
        restaurantId: params.restaurantId,
        upserts: [
          { field: "name", locale: params.sourceLocale, value: params.texts.name },
          { field: "description", locale: params.sourceLocale, value: params.texts.description },
        ],
      });
    });
  }

  async deleteFormula(params: { formulaId: string; restaurantId: string }): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.translation.deleteMany({
        where: {
          entityType: "FORMULA",
          entityId: params.formulaId,
          restaurantId: params.restaurantId,
        },
      });
      await tx.formula.delete({
        where: { id: params.formulaId, restaurantId: params.restaurantId },
      });
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

/** Index entityType → entityId → field → locale (minuscules) → value. */
type TranslationIndex = Map<string, Map<string, Map<string, Map<string, string>>>>;

function indexTranslations(
  rows: { entityType: string; entityId: string; field: string; locale: string; value: string }[],
): TranslationIndex {
  const index: TranslationIndex = new Map();
  for (const t of rows) {
    let byEntity = index.get(t.entityType);
    if (!byEntity) {
      byEntity = new Map();
      index.set(t.entityType, byEntity);
    }
    let byField = byEntity.get(t.entityId);
    if (!byField) {
      byField = new Map();
      byEntity.set(t.entityId, byField);
    }
    let byLocale = byField.get(t.field);
    if (!byLocale) {
      byLocale = new Map();
      byField.set(t.field, byLocale);
    }
    // Minuscules : tolère les lignes legacy 'FR'/'EN' (fenêtre 076 → 077).
    byLocale.set(t.locale.toLowerCase(), t.value);
  }
  return index;
}

function localizedTextOf(
  index: TranslationIndex,
  entityType: string,
  entityId: string,
  field: string,
): LocalizedText {
  const byLocale = index.get(entityType)?.get(entityId)?.get(field);
  if (!byLocale) return {};
  const out: LocalizedText = {};
  for (const [locale, value] of byLocale) {
    if (isMenuLocale(locale)) out[locale] = value;
  }
  return out;
}

/**
 * Upsert des textes d'une entité : valeur vide ⇒ suppression de la ligne (sémantique
 * « missing »), sinon upsert. `sourceTextHash` est remis à `null` à chaque écriture
 * par ce chemin legacy (formulaires d'édition) — les écritures « conscientes » du
 * hash passent par `TranslationRepository.upsertMany` (revue + auto-traduction).
 */
async function upsertEntityTexts(
  tx: Pick<PrismaClient, "translation">,
  params: {
    entityType: string;
    entityId: string;
    restaurantId: string;
    upserts: { field: string; locale: string; value: string }[];
  },
): Promise<void> {
  for (const u of params.upserts) {
    if (u.value.trim() === "") {
      await tx.translation.deleteMany({
        where: {
          entityType: params.entityType,
          entityId: params.entityId,
          field: u.field,
          locale: u.locale,
          restaurantId: params.restaurantId,
        },
      });
      continue;
    }

    await tx.translation.upsert({
      where: {
        entityType_entityId_field_locale: {
          entityType: params.entityType,
          entityId: params.entityId,
          field: u.field,
          locale: u.locale,
        },
      },
      update: { value: u.value, sourceTextHash: null },
      create: {
        entityType: params.entityType,
        entityId: params.entityId,
        field: u.field,
        locale: u.locale,
        value: u.value,
        sourceTextHash: null,
        restaurantId: params.restaurantId,
      },
    });
  }
}
