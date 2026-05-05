import { describe, it, expect, vi } from "vitest";
import { PublishMenu } from "./PublishMenu";
import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { SnapshotRepository } from "@/application/ports/SnapshotRepository";
import type { Clock } from "@/application/ports/Clock";
import type { MenuOverview } from "@/domain/menu/MenuTypes";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";

const RESTAURANT_FIXTURE = {
  id: "resto-1",
  slug: "resto-abcd1234",
  displayName: "Mon Restaurant",
  planStatus: "ACTIVE" as PlanStatus,
  activationDismissedAt: null,
};

const MENU_FIXTURE: MenuOverview = {
  menuId: "menu-1",
  restaurantId: "resto-1",
  status: "DRAFT",
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

function createMockMenuRepo(overrides: Partial<MenuRepository> = {}): MenuRepository {
  return {
    getMenuByRestaurantId: async () => MENU_FIXTURE,
    createItem: async () => ({ id: "id" }),
    updateItem: async () => {},
    deleteItem: async () => {},
    getItem: async () => ({ imagePath: null }),
    updateItemImage: async () => {},
    reorderItems: async () => {},
    verifyCategoryOwnership: async () => true,
    verifyMenuOwnership: async () => true,
    getNextItemOrder: async () => 0,
    updateMenuStatus: vi.fn(async () => {}),
    markMenuAsDraft: async () => {},
    listCategoryNames: async () => [],
    createCategory: async () => ({ id: "id" }),
    renameCategory: async () => {},
    deleteCategory: async () => {},
    reorderCategories: async () => {},
    getMenuIdByRestaurantId: async () => "menu-1",
    ...overrides,
  };
}

function createMockRestaurantRepo(
  overrides: Partial<RestaurantRepository> = {},
): RestaurantRepository {
  return {
    findByOwnerUserId: async () => null,
    createWithMenuAndCategories: async () => ({ id: "id" }),
    getRestaurantById: async () => RESTAURANT_FIXTURE,
    updateDisplayName: async () => {},
    markActivationDismissed: async () => {},
    delete: async () => {},
    ...overrides,
  };
}

function createMockSnapshotRepo(overrides: Partial<SnapshotRepository> = {}): SnapshotRepository {
  return {
    upsertSnapshot: vi.fn(async () => {}),
    getSnapshotBySlug: async () => null,
    listPublished: async () => [],
    ...overrides,
  };
}

function createMockClock(iso = "2026-03-25T12:00:00.000Z"): Clock {
  return { nowISO: () => iso };
}

describe("PublishMenu", () => {
  it("publishes menu for ACTIVE plan with items", async () => {
    const menuRepo = createMockMenuRepo();
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

  it("throws plan_inactive for FREE plan", async () => {
    const snapshotRepo = createMockSnapshotRepo();
    const uc = new PublishMenu(
      createMockMenuRepo(),
      createMockRestaurantRepo({
        getRestaurantById: async () => ({
          ...RESTAURANT_FIXTURE,
          planStatus: "FREE",
        }),
      }),
      snapshotRepo,
      createMockClock(),
    );

    await expect(uc.execute({ restaurantId: "resto-1" })).rejects.toThrow("plan_inactive");
    expect(snapshotRepo.upsertSnapshot).not.toHaveBeenCalled();
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
      createMockMenuRepo({
        getMenuByRestaurantId: async () => menuWithNoItems,
      }),
      createMockRestaurantRepo(),
      createMockSnapshotRepo(),
      createMockClock(),
    );

    await expect(uc.execute({ restaurantId: "resto-1" })).rejects.toThrow("no_items");
  });

  it("throws when restaurant not found", async () => {
    const uc = new PublishMenu(
      createMockMenuRepo(),
      createMockRestaurantRepo({ getRestaurantById: async () => null }),
      createMockSnapshotRepo(),
      createMockClock(),
    );

    await expect(uc.execute({ restaurantId: "unknown" })).rejects.toThrow("Restaurant introuvable");
  });

  it("throws when menu not found", async () => {
    const uc = new PublishMenu(
      createMockMenuRepo({ getMenuByRestaurantId: async () => null }),
      createMockRestaurantRepo(),
      createMockSnapshotRepo(),
      createMockClock(),
    );

    await expect(uc.execute({ restaurantId: "resto-1" })).rejects.toThrow("Menu introuvable");
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
      createMockMenuRepo({
        getMenuByRestaurantId: async () => menuWithMixed,
      }),
      createMockRestaurantRepo(),
      snapshotRepo,
      createMockClock(),
    );

    await uc.execute({ restaurantId: "resto-1" });

    expect(snapshotRepo.upsertSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotData: expect.objectContaining({
          categories: [
            {
              name: "Entrées",
              items: [expect.objectContaining({ nameFr: "Soupe" })],
            },
          ],
        }),
      }),
    );
  });
});
