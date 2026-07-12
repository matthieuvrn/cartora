import { describe, it, expect } from "vitest";
import { GetTranslationOverview } from "./GetTranslationOverview";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import { createMockTranslationRepo } from "./__fixtures__/translationRepoMock";
import { hashSourceText } from "@/domain/menu/textHash";
import type { MenuOverview } from "@/domain/menu/MenuTypes";

function menuFixture(overrides: Partial<MenuOverview> = {}): MenuOverview {
  return {
    menuId: "menu-1",
    restaurantId: "resto-1",
    status: "DRAFT",
    template: "CLASSIC",
    publishedAt: null,
    sourceLocale: "fr",
    enabledLocales: ["en"],
    categories: [
      {
        id: "cat-1",
        name: "Entrées",
        nameTexts: { fr: "Entrées" },
        order: 0,
        items: [
          {
            id: "item-1",
            priceCents: 1200,
            badge: "NONE",
            allergens: [],
            isAvailable: true,
            order: 0,
            translations: {
              fr: { name: "Salade", description: "Fraîche" },
              en: { name: "", description: "" },
            },
            texts: { name: { fr: "Salade" }, description: { fr: "Fraîche" } },
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("GetTranslationOverview", () => {
  it("reports missing for an enabled locale with no translation rows", async () => {
    const menuRepo = createMockMenuRepo({ getMenuByRestaurantId: async () => menuFixture() });
    const translationRepo = createMockTranslationRepo();
    const uc = new GetTranslationOverview(menuRepo, translationRepo);

    const result = await uc.execute({ restaurantId: "resto-1" });

    expect(result.sourceLocale).toBe("fr");
    expect(result.enabledLocales).toEqual(["en"]);
    // 2 unités : item name + description (la catégorie a aussi un nom source).
    const names = result.units.map((u) => `${u.entityType}.${u.field}`);
    expect(names).toEqual(["CATEGORY.name", "ITEM.name", "ITEM.description"]);
    for (const unit of result.units) {
      expect(unit.perLocale.en).toEqual({ value: "", status: "missing" });
    }
    expect(result.coverage).toEqual([{ locale: "en", total: 3, fresh: 0, stale: 0, missing: 3 }]);
  });

  it("marks a translation fresh when its hash matches the current source", async () => {
    const menuRepo = createMockMenuRepo({ getMenuByRestaurantId: async () => menuFixture() });
    const translationRepo = createMockTranslationRepo({
      listForRestaurant: async () => [
        {
          entityType: "ITEM",
          entityId: "item-1",
          field: "name",
          locale: "en",
          value: "Salad",
          sourceTextHash: hashSourceText("Salade"),
        },
      ],
    });
    const uc = new GetTranslationOverview(menuRepo, translationRepo);

    const result = await uc.execute({ restaurantId: "resto-1" });

    const itemName = result.units.find((u) => u.entityType === "ITEM" && u.field === "name");
    expect(itemName?.perLocale.en).toEqual({ value: "Salad", status: "fresh" });
    expect(result.coverage[0]).toEqual({ locale: "en", total: 3, fresh: 1, stale: 0, missing: 2 });
  });

  it("marks a translation stale when the source changed (hash mismatch)", async () => {
    const menuRepo = createMockMenuRepo({ getMenuByRestaurantId: async () => menuFixture() });
    const translationRepo = createMockTranslationRepo({
      listForRestaurant: async () => [
        {
          entityType: "ITEM",
          entityId: "item-1",
          field: "name",
          locale: "en",
          value: "Old salad",
          sourceTextHash: hashSourceText("Ancienne salade"),
        },
      ],
    });
    const uc = new GetTranslationOverview(menuRepo, translationRepo);

    const result = await uc.execute({ restaurantId: "resto-1" });

    const itemName = result.units.find((u) => u.entityType === "ITEM" && u.field === "name");
    expect(itemName?.perLocale.en?.status).toBe("stale");
  });

  it("excludes fields whose source text is empty", async () => {
    const menu = menuFixture();
    menu.categories[0].items[0].texts.description = {};
    const menuRepo = createMockMenuRepo({ getMenuByRestaurantId: async () => menu });
    const uc = new GetTranslationOverview(menuRepo, createMockTranslationRepo());

    const result = await uc.execute({ restaurantId: "resto-1" });

    expect(result.units.map((u) => u.field)).toEqual(["name", "name"]); // category + item name only
  });

  it("throws menu_not_found when the menu is missing", async () => {
    const menuRepo = createMockMenuRepo({ getMenuByRestaurantId: async () => null });
    const uc = new GetTranslationOverview(menuRepo, createMockTranslationRepo());

    await expect(uc.execute({ restaurantId: "ghost" })).rejects.toMatchObject({
      name: "DomainError",
      code: "menu_not_found",
    });
  });
});
