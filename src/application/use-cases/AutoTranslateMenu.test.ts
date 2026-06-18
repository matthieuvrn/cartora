import { describe, it, expect, vi } from "vitest";
import { AutoTranslateMenu } from "./AutoTranslateMenu";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import {
  createMockRestaurantRepo,
  restaurantFixtureForTier,
} from "./__fixtures__/restaurantRepoMock";
import { createMockTranslationRepo } from "./__fixtures__/translationRepoMock";
import { createMockTranslationService } from "./__fixtures__/translationServiceMock";
import { hashSourceText } from "@/domain/menu/textHash";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
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
            imagePath: null,
            altTextFr: null,
            altTextEn: null,
            order: 0,
            translations: {
              fr: { name: "Salade", description: "Fraîche" },
              en: { name: "", description: "" },
            },
            texts: { name: { fr: "Salade" }, description: { fr: "Fraîche" }, altText: {} },
          },
        ],
      },
    ],
    ...overrides,
  };
}

function restaurantRepoOf(tier: PlanTier) {
  return createMockRestaurantRepo({
    getRestaurantById: async () => restaurantFixtureForTier(tier),
  });
}

function menuRepoOf(menu: MenuOverview) {
  return createMockMenuRepo({
    getMenuByRestaurantId: async () => menu,
    listDailyDishes: async () => [],
    listFormulas: async () => [],
  });
}

describe("AutoTranslateMenu", () => {
  it("translates only missing/stale fields and writes fresh hashes (PRO)", async () => {
    const menu = menuFixture();
    const translationRepo = createMockTranslationRepo({
      // item name already fresh → must be skipped; category + description missing.
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
    const service = createMockTranslationService();
    const uc = new AutoTranslateMenu(
      menuRepoOf(menu),
      restaurantRepoOf("PRO"),
      translationRepo,
      service,
    );

    const result = await uc.execute({ restaurantId: "resto-1", targetLocale: "en" });

    // 3 units total (category name, item name, item desc); item name fresh → 2 translated.
    expect(result).toEqual({ translatedCount: 2, skippedCount: 1 });
    expect(service.translateBatch).toHaveBeenCalledWith({
      sourceLocale: "fr",
      targetLocale: "en",
      texts: ["Entrées", "Fraîche"],
    });
    expect(translationRepo.upsertMany).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      rows: [
        {
          entityType: "CATEGORY",
          entityId: "cat-1",
          field: "name",
          locale: "en",
          value: "[en] Entrées",
          sourceTextHash: hashSourceText("Entrées"),
        },
        {
          entityType: "ITEM",
          entityId: "item-1",
          field: "description",
          locale: "en",
          value: "[en] Fraîche",
          sourceTextHash: hashSourceText("Fraîche"),
        },
      ],
    });
  });

  it("does nothing and reports all skipped when everything is fresh", async () => {
    const translationRepo = createMockTranslationRepo({
      listForRestaurant: async () => [
        {
          entityType: "CATEGORY",
          entityId: "cat-1",
          field: "name",
          locale: "en",
          value: "Starters",
          sourceTextHash: hashSourceText("Entrées"),
        },
        {
          entityType: "ITEM",
          entityId: "item-1",
          field: "name",
          locale: "en",
          value: "Salad",
          sourceTextHash: hashSourceText("Salade"),
        },
        {
          entityType: "ITEM",
          entityId: "item-1",
          field: "description",
          locale: "en",
          value: "Fresh",
          sourceTextHash: hashSourceText("Fraîche"),
        },
      ],
    });
    const service = createMockTranslationService();
    const uc = new AutoTranslateMenu(
      menuRepoOf(menuFixture()),
      restaurantRepoOf("PRO"),
      translationRepo,
      service,
    );

    const result = await uc.execute({ restaurantId: "resto-1", targetLocale: "en" });

    expect(result).toEqual({ translatedCount: 0, skippedCount: 3 });
    expect(service.translateBatch).not.toHaveBeenCalled();
    expect(translationRepo.upsertMany).not.toHaveBeenCalled();
  });

  it("rejects non-PRO tiers", async () => {
    const service = createMockTranslationService();
    const uc = new AutoTranslateMenu(
      menuRepoOf(menuFixture()),
      restaurantRepoOf("STARTER"),
      createMockTranslationRepo(),
      service,
    );

    await expect(uc.execute({ restaurantId: "resto-1", targetLocale: "en" })).rejects.toMatchObject(
      { name: "DomainError", code: "auto_translation_not_allowed" },
    );
    expect(service.translateBatch).not.toHaveBeenCalled();
  });

  it("rejects a locale that is not enabled", async () => {
    const uc = new AutoTranslateMenu(
      menuRepoOf(menuFixture({ enabledLocales: ["en"] })),
      restaurantRepoOf("PRO"),
      createMockTranslationRepo(),
      createMockTranslationService(),
    );

    await expect(uc.execute({ restaurantId: "resto-1", targetLocale: "es" })).rejects.toMatchObject(
      { name: "DomainError", code: "locale_not_enabled" },
    );
  });

  it("propagates a quota-exhausted failure from the service", async () => {
    const service = createMockTranslationService({
      translateBatch: vi.fn(async () => {
        throw Object.assign(new Error("DomainError(translation_quota_exhausted)"), {
          name: "DomainError",
          code: "translation_quota_exhausted",
          metadata: {},
        });
      }),
    });
    const uc = new AutoTranslateMenu(
      menuRepoOf(menuFixture()),
      restaurantRepoOf("PRO"),
      createMockTranslationRepo(),
      service,
    );

    await expect(uc.execute({ restaurantId: "resto-1", targetLocale: "en" })).rejects.toMatchObject(
      { code: "translation_quota_exhausted" },
    );
  });
});
