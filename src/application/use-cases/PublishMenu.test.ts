import { describe, it, expect, vi } from "vitest";
import { PublishMenu } from "./PublishMenu";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import { createMockRestaurantRepo, restaurantFixture } from "./__fixtures__/restaurantRepoMock";
import { createMockSnapshotRepo } from "./__fixtures__/snapshotRepoMock";
import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { Clock } from "@/application/ports/Clock";
import type { MenuOverview } from "@/domain/menu/MenuTypes";

const MENU_FIXTURE: MenuOverview = {
  menuId: "menu-1",
  restaurantId: "resto-1",
  status: "DRAFT",
  template: "CLASSIC",
  publishedAt: null,
  categories: [
    {
      id: "cat-1",
      name: "Entrées",
      order: 0,
      items: [
        {
          id: "item-1",
          priceCents: 850,
          badge: "NONE",
          allergens: [],
          isAvailable: true,
          imagePath: null,
          altTextFr: null,
          altTextEn: null,
          order: 0,
          translations: {
            fr: { name: "Soupe", description: "Soupe du jour" },
            en: { name: "Soup", description: "Soup of the day" },
          },
        },
      ],
    },
    { id: "cat-2", name: "Plats", order: 1, items: [] },
    { id: "cat-3", name: "Desserts", order: 2, items: [] },
    { id: "cat-4", name: "Boissons", order: 3, items: [] },
  ],
};

/**
 * Override par défaut pour PublishMenu : le menu doit exister. Tous les tests
 * de ce fichier en ont besoin sauf celui qui vérifie explicitement le cas null.
 */
function createPublishableMenuRepo(overrides: Partial<MenuRepository> = {}): MenuRepository {
  return createMockMenuRepo({
    getMenuByRestaurantId: async () => MENU_FIXTURE,
    ...overrides,
  });
}

function createMockClock(iso = "2026-03-25T12:00:00.000Z"): Clock {
  return { nowISO: () => iso };
}

describe("PublishMenu", () => {
  it("publishes menu for ACTIVE plan with items", async () => {
    const menuRepo = createPublishableMenuRepo();
    const snapshotRepo = createMockSnapshotRepo();
    const uc = new PublishMenu(
      menuRepo,
      createMockRestaurantRepo(),
      snapshotRepo,
      createMockClock(),
    );

    const result = await uc.execute({ restaurantId: "resto-1" });

    expect(result).toEqual({ slug: "resto-abcd1234" });
    expect(snapshotRepo.upsertSnapshot).toHaveBeenCalledWith({
      menuId: "menu-1",
      restaurantId: "resto-1",
      slug: "resto-abcd1234",
      snapshotData: {
        restaurantName: "Mon Restaurant",
        template: "CLASSIC",
        categories: [
          {
            name: "Entrées",
            items: [
              {
                nameFr: "Soupe",
                nameEn: "Soup",
                descriptionFr: "Soupe du jour",
                descriptionEn: "Soup of the day",
                priceCents: 850,
                badge: "NONE",
                allergens: [],
                imagePath: null,
                altTextFr: "",
                altTextEn: "",
              },
            ],
          },
        ],
        publishedAt: "2026-03-25T12:00:00.000Z",
      },
      publishedAt: "2026-03-25T12:00:00.000Z",
    });
    expect(menuRepo.updateMenuStatus).toHaveBeenCalledWith({
      menuId: "menu-1",
      status: "PUBLISHED",
      publishedAt: "2026-03-25T12:00:00.000Z",
    });
  });

  it("embeds branding in the snapshot when the template customizes colors (Classic), any tier", async () => {
    // Set 2026 : couleurs ouvertes à tous → un STARTER avec un template Classic embarque
    // ses couleurs dans le snapshot (le gate n'est plus tier, mais template).
    const snapshotRepo = createMockSnapshotRepo();
    const uc = new PublishMenu(
      createPublishableMenuRepo(),
      createMockRestaurantRepo({
        getRestaurantById: async () =>
          restaurantFixture({
            planTier: "STARTER",
            planStatus: "ACTIVE",
            brandPrimary: "#0c0a09",
            brandAccent: "#fbbf24",
            brandBackground: "#ffffff",
          }),
      }),
      snapshotRepo,
      createMockClock(),
    );

    await uc.execute({ restaurantId: "resto-1" });

    const { snapshotData } = vi.mocked(snapshotRepo.upsertSnapshot).mock.calls[0][0];
    expect(snapshotData.branding).toEqual({
      primary: "#0c0a09",
      accent: "#fbbf24",
      background: "#ffffff",
    });
  });

  it("omits branding when the template does not customize colors (premium), even with colors set", async () => {
    const snapshotRepo = createMockSnapshotRepo();
    const uc = new PublishMenu(
      createPublishableMenuRepo({
        getMenuByRestaurantId: async () => ({ ...MENU_FIXTURE, template: "NOIR" }),
      }),
      createMockRestaurantRepo({
        getRestaurantById: async () =>
          restaurantFixture({
            planTier: "PRO",
            planStatus: "ACTIVE",
            brandPrimary: "#0c0a09",
            brandAccent: "#fbbf24",
            brandBackground: "#ffffff",
          }),
      }),
      snapshotRepo,
      createMockClock(),
    );

    await uc.execute({ restaurantId: "resto-1" });

    const { snapshotData } = vi.mocked(snapshotRepo.upsertSnapshot).mock.calls[0][0];
    expect(snapshotData.template).toBe("NOIR");
    expect(snapshotData.branding).toBeUndefined();
  });

  it("throws plan_inactive for FREE tier", async () => {
    const snapshotRepo = createMockSnapshotRepo();
    const uc = new PublishMenu(
      createPublishableMenuRepo(),
      createMockRestaurantRepo({
        getRestaurantById: async () => restaurantFixture({ planStatus: "FREE", planTier: "FREE" }),
      }),
      snapshotRepo,
      createMockClock(),
    );

    await expect(uc.execute({ restaurantId: "resto-1" })).rejects.toMatchObject({
      name: "DomainError",
      code: "plan_inactive",
      metadata: { tier: "FREE" },
    });
    expect(snapshotRepo.upsertSnapshot).not.toHaveBeenCalled();
  });

  it("throws plan_inactive for PAST_DUE billing (Pro tier but billing issue)", async () => {
    const snapshotRepo = createMockSnapshotRepo();
    const uc = new PublishMenu(
      createPublishableMenuRepo(),
      createMockRestaurantRepo({
        getRestaurantById: async () =>
          restaurantFixture({ planStatus: "PAST_DUE", planTier: "PRO" }),
      }),
      snapshotRepo,
      createMockClock(),
    );

    await expect(uc.execute({ restaurantId: "resto-1" })).rejects.toMatchObject({
      name: "DomainError",
      code: "plan_inactive",
      metadata: { tier: "PRO" },
    });
    expect(snapshotRepo.upsertSnapshot).not.toHaveBeenCalled();
  });

  it("includes daily entries in the snapshot when restaurant tier allows it (S3.1)", async () => {
    const snapshotRepo = createMockSnapshotRepo();
    const listDailyDishes = vi.fn(async () => [
      {
        id: "daily-1",
        priceCents: 1500,
        badge: "NONE" as const,
        allergens: [],
        imagePath: null,
        altTextFr: null,
        altTextEn: null,
        validUntilISO: "2026-03-25T22:00:00.000Z",
        order: 0,
        translations: {
          fr: { name: "Pot-au-feu", description: "Plat mijoté" },
          en: { name: "Beef stew", description: "" },
        },
      },
    ]);
    const uc = new PublishMenu(
      createPublishableMenuRepo({ listDailyDishes }),
      createMockRestaurantRepo(),
      snapshotRepo,
      createMockClock(),
    );

    await uc.execute({ restaurantId: "resto-1" });

    expect(listDailyDishes).toHaveBeenCalledWith("resto-1");
    const call = (snapshotRepo.upsertSnapshot as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.snapshotData.dailyItems).toEqual([
      {
        id: "daily-1",
        nameFr: "Pot-au-feu",
        nameEn: "Beef stew",
        descriptionFr: "Plat mijoté",
        descriptionEn: "",
        priceCents: 1500,
        badge: "NONE",
        allergens: [],
        imagePath: null,
        altTextFr: "",
        altTextEn: "",
        validUntilISO: "2026-03-25T22:00:00.000Z",
      },
    ]);
  });

  it("does not load daily entries for FREE tier (gating prunes call)", async () => {
    const listDailyDishes = vi.fn(async () => []);
    const uc = new PublishMenu(
      createPublishableMenuRepo({ listDailyDishes }),
      createMockRestaurantRepo({
        // FREE tier ⇒ canPublish renvoie plan_free et on throw avant listDailyDishes.
        getRestaurantById: async () => restaurantFixture({ planStatus: "FREE", planTier: "FREE" }),
      }),
      createMockSnapshotRepo(),
      createMockClock(),
    );

    await expect(uc.execute({ restaurantId: "resto-1" })).rejects.toMatchObject({
      name: "DomainError",
      code: "plan_inactive",
    });
    expect(listDailyDishes).not.toHaveBeenCalled();
  });

  it("publishes for STARTER tier with ACTIVE status", async () => {
    const snapshotRepo = createMockSnapshotRepo();
    const uc = new PublishMenu(
      createPublishableMenuRepo(),
      createMockRestaurantRepo({
        getRestaurantById: async () =>
          restaurantFixture({ planStatus: "ACTIVE", planTier: "STARTER" }),
      }),
      snapshotRepo,
      createMockClock(),
    );

    const result = await uc.execute({ restaurantId: "resto-1" });
    expect(result).toEqual({ slug: "resto-abcd1234" });
    expect(snapshotRepo.upsertSnapshot).toHaveBeenCalled();
  });

  it("throws no_items when no available items", async () => {
    const menuWithNoItems: MenuOverview = {
      ...MENU_FIXTURE,
      categories: MENU_FIXTURE.categories.map((cat) => ({
        ...cat,
        items: cat.items.map((item) => ({ ...item, isAvailable: false })),
      })),
    };
    const uc = new PublishMenu(
      createPublishableMenuRepo({
        getMenuByRestaurantId: async () => menuWithNoItems,
      }),
      createMockRestaurantRepo(),
      createMockSnapshotRepo(),
      createMockClock(),
    );

    await expect(uc.execute({ restaurantId: "resto-1" })).rejects.toMatchObject({
      name: "DomainError",
      code: "no_items",
    });
  });

  it("throws when restaurant not found", async () => {
    const uc = new PublishMenu(
      createPublishableMenuRepo(),
      createMockRestaurantRepo({ getRestaurantById: async () => null }),
      createMockSnapshotRepo(),
      createMockClock(),
    );

    await expect(uc.execute({ restaurantId: "unknown" })).rejects.toMatchObject({
      name: "DomainError",
      code: "restaurant_not_found",
      metadata: { entityId: "unknown" },
    });
  });

  it("throws when menu not found", async () => {
    const uc = new PublishMenu(
      createMockMenuRepo({ getMenuByRestaurantId: async () => null }),
      createMockRestaurantRepo(),
      createMockSnapshotRepo(),
      createMockClock(),
    );

    await expect(uc.execute({ restaurantId: "resto-1" })).rejects.toMatchObject({
      name: "DomainError",
      code: "menu_not_found",
      metadata: { entityId: "resto-1" },
    });
  });

  it("snapshot excludes unavailable items", async () => {
    const menuWithMixed: MenuOverview = {
      ...MENU_FIXTURE,
      categories: [
        {
          id: "cat-1",
          name: "Entrées",
          order: 0,
          items: [
            {
              id: "item-1",
              priceCents: 850,
              badge: "NONE",
              allergens: [],
              isAvailable: true,
              imagePath: null,
              altTextFr: null,
              altTextEn: null,
              order: 0,
              translations: {
                fr: { name: "Soupe", description: "Soupe du jour" },
                en: { name: "Soup", description: "Soup of the day" },
              },
            },
            {
              id: "item-2",
              priceCents: 1200,
              badge: "NEW",
              allergens: [],
              isAvailable: false,
              imagePath: null,
              altTextFr: null,
              altTextEn: null,
              order: 1,
              translations: {
                fr: { name: "Salade", description: "Salade verte" },
                en: { name: "Salad", description: "Green salad" },
              },
            },
          ],
        },
      ],
    };
    const snapshotRepo = createMockSnapshotRepo();
    const uc = new PublishMenu(
      createPublishableMenuRepo({
        getMenuByRestaurantId: async () => menuWithMixed,
      }),
      createMockRestaurantRepo(),
      snapshotRepo,
      createMockClock(),
    );

    await uc.execute({ restaurantId: "resto-1" });

    expect(snapshotRepo.upsertSnapshot).toHaveBeenCalledWith({
      menuId: "menu-1",
      restaurantId: "resto-1",
      slug: "resto-abcd1234",
      snapshotData: {
        restaurantName: "Mon Restaurant",
        template: "CLASSIC",
        categories: [
          {
            name: "Entrées",
            items: [
              {
                nameFr: "Soupe",
                nameEn: "Soup",
                descriptionFr: "Soupe du jour",
                descriptionEn: "Soup of the day",
                priceCents: 850,
                badge: "NONE",
                allergens: [],
                imagePath: null,
                altTextFr: "",
                altTextEn: "",
              },
            ],
          },
        ],
        publishedAt: "2026-03-25T12:00:00.000Z",
      },
      publishedAt: "2026-03-25T12:00:00.000Z",
    });
  });
});
