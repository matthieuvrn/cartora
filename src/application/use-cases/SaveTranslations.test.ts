import { describe, it, expect } from "vitest";
import { SaveTranslations } from "./SaveTranslations";
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
            id: "11111111-1111-1111-1111-111111111111",
            priceCents: 1200,
            badge: "NONE",
            allergens: [],
            isAvailable: true,
            imagePath: null,
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

const ITEM_ID = "11111111-1111-1111-1111-111111111111";

function menuRepoOf(menu: MenuOverview) {
  return createMockMenuRepo({ getMenuByRestaurantId: async () => menu });
}

describe("SaveTranslations", () => {
  it("upserts entries with a hash computed against the current source text", async () => {
    const translationRepo = createMockTranslationRepo();
    const uc = new SaveTranslations(menuRepoOf(menuFixture()), translationRepo);

    const result = await uc.execute({
      restaurantId: "resto-1",
      locale: "en",
      entries: [{ entityType: "ITEM", entityId: ITEM_ID, field: "name", value: "  Salad  " }],
    });

    expect(result).toEqual({ savedCount: 1 });
    expect(translationRepo.upsertMany).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      rows: [
        {
          entityType: "ITEM",
          entityId: ITEM_ID,
          field: "name",
          locale: "en",
          value: "Salad",
          sourceTextHash: hashSourceText("Salade"),
        },
      ],
    });
  });

  it("stores an empty value with a null hash (deletes the row downstream)", async () => {
    const translationRepo = createMockTranslationRepo();
    const uc = new SaveTranslations(menuRepoOf(menuFixture()), translationRepo);

    await uc.execute({
      restaurantId: "resto-1",
      locale: "en",
      entries: [{ entityType: "ITEM", entityId: ITEM_ID, field: "name", value: "   " }],
    });

    expect(translationRepo.upsertMany).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      rows: [
        {
          entityType: "ITEM",
          entityId: ITEM_ID,
          field: "name",
          locale: "en",
          value: "",
          sourceTextHash: null,
        },
      ],
    });
  });

  it("rejects an invalid locale code", async () => {
    const translationRepo = createMockTranslationRepo();
    const uc = new SaveTranslations(menuRepoOf(menuFixture()), translationRepo);

    await expect(
      uc.execute({ restaurantId: "resto-1", locale: "xx", entries: [] }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "invalid_locale",
      metadata: { locale: "xx" },
    });
    expect(translationRepo.upsertMany).not.toHaveBeenCalled();
  });

  it("rejects a locale that is not enabled for the menu", async () => {
    const translationRepo = createMockTranslationRepo();
    const uc = new SaveTranslations(
      menuRepoOf(menuFixture({ enabledLocales: ["en"] })),
      translationRepo,
    );

    await expect(
      uc.execute({ restaurantId: "resto-1", locale: "es", entries: [] }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "locale_not_enabled",
      metadata: { locale: "es" },
    });
  });

  it("rejects writing to the source locale", async () => {
    const translationRepo = createMockTranslationRepo();
    const uc = new SaveTranslations(menuRepoOf(menuFixture()), translationRepo);

    await expect(
      uc.execute({ restaurantId: "resto-1", locale: "fr", entries: [] }),
    ).rejects.toMatchObject({ name: "DomainError", code: "locale_not_enabled" });
  });

  it("rejects an entry that does not map to a known translatable unit", async () => {
    const translationRepo = createMockTranslationRepo();
    const uc = new SaveTranslations(menuRepoOf(menuFixture()), translationRepo);

    await expect(
      uc.execute({
        restaurantId: "resto-1",
        locale: "en",
        entries: [
          {
            entityType: "ITEM",
            entityId: "99999999-9999-9999-9999-999999999999",
            field: "name",
            value: "x",
          },
        ],
      }),
    ).rejects.toMatchObject({ name: "DomainError", code: "ownership_mismatch" });
    expect(translationRepo.upsertMany).not.toHaveBeenCalled();
  });

  it("clamps the value to the field max length", async () => {
    const translationRepo = createMockTranslationRepo();
    const uc = new SaveTranslations(menuRepoOf(menuFixture()), translationRepo);
    const longName = "a".repeat(150);

    await uc.execute({
      restaurantId: "resto-1",
      locale: "en",
      entries: [{ entityType: "ITEM", entityId: ITEM_ID, field: "name", value: longName }],
    });

    const call = (translationRepo.upsertMany as ReturnType<typeof import("vitest").vi.fn>).mock
      .calls[0][0];
    expect(call.rows[0].value).toHaveLength(100); // item name cap
  });
});
