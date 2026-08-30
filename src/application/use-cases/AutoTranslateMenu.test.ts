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
import {
  MAX_TRANSLATE_CALLS_PER_DAY,
  MAX_TRANSLATE_CHARS_PER_DAY,
} from "@/domain/menu/TranslationBudgetPolicy";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import type { MenuOverview } from "@/domain/menu/MenuTypes";
import type { Clock } from "@/application/ports/Clock";
import type { TranslationUsageRepository } from "@/application/ports/TranslationUsageRepository";

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
            texts: { name: { fr: "Salade" }, description: { fr: "Fraîche" } },
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

// 22h30 UTC le 30/08 = 00h30 Paris le 31/08 → prouve le bucketing jour PARIS du budget.
const FIXED_NOW = "2026-08-30T22:30:00.000Z";
const clock: Clock = { nowISO: () => FIXED_NOW };

// Port étroit → mock local (convention __fixtures__ : pas de fixture partagée).
function createMockUsageRepo(
  overrides: Partial<TranslationUsageRepository> = {},
): TranslationUsageRepository {
  return {
    getUsage: vi.fn(async () => ({ dayCalls: 0, dayChars: 0, monthCharsGlobal: 0 })),
    recordUsage: vi.fn(async () => {}),
    ...overrides,
  };
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
    const menuRepo = menuRepoOf(menu);
    const uc = new AutoTranslateMenu(
      menuRepo,
      restaurantRepoOf("PRO"),
      translationRepo,
      service,
      createMockUsageRepo(),
      clock,
    );

    const result = await uc.execute({ restaurantId: "resto-1", targetLocale: "en" });

    // 3 units total (category name, item name, item desc); item name fresh → 2 translated.
    expect(result).toEqual({ translatedCount: 2, skippedCount: 1 });
    // Des lignes ont été écrites → repasse en DRAFT.
    expect(menuRepo.markMenuAsDraft).toHaveBeenCalledWith("resto-1");
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
    const menuRepo = menuRepoOf(menuFixture());
    const usageRepo = createMockUsageRepo();
    const uc = new AutoTranslateMenu(
      menuRepo,
      restaurantRepoOf("PRO"),
      translationRepo,
      service,
      usageRepo,
      clock,
    );

    const result = await uc.execute({ restaurantId: "resto-1", targetLocale: "en" });

    expect(result).toEqual({ translatedCount: 0, skippedCount: 3 });
    expect(service.translateBatch).not.toHaveBeenCalled();
    expect(translationRepo.upsertMany).not.toHaveBeenCalled();
    // Rien n'a changé (tout à jour) → pas de re-brouillon inutile.
    expect(menuRepo.markMenuAsDraft).not.toHaveBeenCalled();
    // No-op ⇒ le budget n'est ni lu ni consommé.
    expect(usageRepo.getUsage).not.toHaveBeenCalled();
    expect(usageRepo.recordUsage).not.toHaveBeenCalled();
  });

  it("rejects non-PRO tiers", async () => {
    const service = createMockTranslationService();
    const uc = new AutoTranslateMenu(
      menuRepoOf(menuFixture()),
      restaurantRepoOf("STARTER"),
      createMockTranslationRepo(),
      service,
      createMockUsageRepo(),
      clock,
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
      createMockUsageRepo(),
      clock,
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
      createMockUsageRepo(),
      clock,
    );

    await expect(uc.execute({ restaurantId: "resto-1", targetLocale: "en" })).rejects.toMatchObject(
      { code: "translation_quota_exhausted" },
    );
  });

  it("reserves durable usage before translating (calls + chars, Paris day)", async () => {
    const usageRepo = createMockUsageRepo();
    const service = createMockTranslationService();
    const uc = new AutoTranslateMenu(
      menuRepoOf(menuFixture()),
      restaurantRepoOf("PRO"),
      createMockTranslationRepo(),
      service,
      usageRepo,
      clock,
    );

    await uc.execute({ restaurantId: "resto-1", targetLocale: "en" });

    // 22h30 UTC le 30/08 = 31/08 à Paris — le jour applicatif, pas le jour UTC.
    expect(usageRepo.getUsage).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      day: "2026-08-31",
      monthStart: "2026-08-01",
    });
    // "Entrées" (7) + "Salade" (6) + "Fraîche" (7) = 20 caractères réservés.
    expect(usageRepo.recordUsage).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      day: "2026-08-31",
      calls: 1,
      chars: 20,
    });
  });

  it("blocks the call when the daily call cap is reached, without consuming anything", async () => {
    const usageRepo = createMockUsageRepo({
      getUsage: vi.fn(async () => ({
        dayCalls: MAX_TRANSLATE_CALLS_PER_DAY,
        dayChars: 0,
        monthCharsGlobal: 0,
      })),
    });
    const service = createMockTranslationService();
    const translationRepo = createMockTranslationRepo();
    const menuRepo = menuRepoOf(menuFixture());
    const uc = new AutoTranslateMenu(
      menuRepo,
      restaurantRepoOf("PRO"),
      translationRepo,
      service,
      usageRepo,
      clock,
    );

    await expect(uc.execute({ restaurantId: "resto-1", targetLocale: "en" })).rejects.toMatchObject(
      {
        name: "DomainError",
        code: "translation_daily_limit_reached",
        metadata: { limit: MAX_TRANSLATE_CALLS_PER_DAY },
      },
    );
    expect(service.translateBatch).not.toHaveBeenCalled();
    expect(usageRepo.recordUsage).not.toHaveBeenCalled();
    expect(translationRepo.upsertMany).not.toHaveBeenCalled();
    expect(menuRepo.markMenuAsDraft).not.toHaveBeenCalled();
  });

  it("blocks the call when the daily char cap would be exceeded", async () => {
    const usageRepo = createMockUsageRepo({
      getUsage: vi.fn(async () => ({
        dayCalls: 0,
        dayChars: MAX_TRANSLATE_CHARS_PER_DAY - 5, // la requête pèse 20 caractères
        monthCharsGlobal: 0,
      })),
    });
    const service = createMockTranslationService();
    const uc = new AutoTranslateMenu(
      menuRepoOf(menuFixture()),
      restaurantRepoOf("PRO"),
      createMockTranslationRepo(),
      service,
      usageRepo,
      clock,
    );

    await expect(uc.execute({ restaurantId: "resto-1", targetLocale: "en" })).rejects.toMatchObject(
      {
        name: "DomainError",
        code: "translation_daily_limit_reached",
        metadata: { limit: MAX_TRANSLATE_CHARS_PER_DAY },
      },
    );
    expect(service.translateBatch).not.toHaveBeenCalled();
    expect(usageRepo.recordUsage).not.toHaveBeenCalled();
  });

  it("blocks the call when the GLOBAL monthly budget is exhausted (env-injected)", async () => {
    const usageRepo = createMockUsageRepo({
      getUsage: vi.fn(async () => ({ dayCalls: 0, dayChars: 0, monthCharsGlobal: 95 })),
    });
    const service = createMockTranslationService();
    const uc = new AutoTranslateMenu(
      menuRepoOf(menuFixture()),
      restaurantRepoOf("PRO"),
      createMockTranslationRepo(),
      service,
      usageRepo,
      clock,
      100, // budget mensuel custom : 95 consommés + 20 demandés > 100
    );

    await expect(uc.execute({ restaurantId: "resto-1", targetLocale: "en" })).rejects.toMatchObject(
      { name: "DomainError", code: "translation_quota_exhausted", metadata: { limit: 100 } },
    );
    expect(service.translateBatch).not.toHaveBeenCalled();
    expect(usageRepo.recordUsage).not.toHaveBeenCalled();
  });
});
