import { describe, it, expect, vi } from "vitest";
import { EnsureRestaurantExists } from "./EnsureRestaurantExists";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import {
  DEFAULT_DISPLAY_NAME,
  generateSlug,
  type InitialCategory,
} from "@/domain/restaurant/RestaurantInitPolicy";

const TRADITIONAL_RESOLVED: InitialCategory[] = [
  { name: "Entrées", order: 0 },
  { name: "Plats", order: 1 },
  { name: "Desserts", order: 2 },
  { name: "Boissons", order: 3 },
];

const PIZZERIA_RESOLVED: InitialCategory[] = [
  { name: "Pizzas", order: 0 },
  { name: "Pâtes", order: 1 },
  { name: "Antipasti", order: 2 },
  { name: "Desserts", order: 3 },
  { name: "Boissons", order: 4 },
];

function createMockRepo(overrides: Partial<RestaurantRepository> = {}): RestaurantRepository {
  return {
    findByOwnerUserId: async () => null,
    createWithMenuAndCategories: vi.fn(async () => ({ id: "resto-new" })),
    getRestaurantById: async () => null,
    updateDisplayName: async () => {},
    markActivationDismissed: async () => {},
    delete: async () => {},
    ...overrides,
  };
}

describe("EnsureRestaurantExists", () => {
  it("returns existing restaurant without creating a new one", async () => {
    const repo = createMockRepo({
      findByOwnerUserId: async () => ({ id: "resto-existing" }),
    });
    const uc = new EnsureRestaurantExists(repo);

    const result = await uc.execute({
      userId: "user-1",
      categories: TRADITIONAL_RESOLVED,
    });

    expect(result).toEqual({ restaurantId: "resto-existing", created: false });
    expect(repo.createWithMenuAndCategories).not.toHaveBeenCalled();
  });

  it("creates a new restaurant with the provided categories and null type by default", async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    const repo = createMockRepo();
    const uc = new EnsureRestaurantExists(repo);

    const result = await uc.execute({
      userId,
      categories: TRADITIONAL_RESOLVED,
    });

    expect(result).toEqual({ restaurantId: "resto-new", created: true });
    expect(repo.createWithMenuAndCategories).toHaveBeenCalledWith({
      ownerUserId: userId,
      displayName: DEFAULT_DISPLAY_NAME,
      slug: generateSlug(userId),
      categories: TRADITIONAL_RESOLVED,
      restaurantType: null,
    });
  });

  it("propagates the restaurantType and pizzeria categories when provided", async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    const repo = createMockRepo();
    const uc = new EnsureRestaurantExists(repo);

    await uc.execute({
      userId,
      restaurantType: "PIZZERIA",
      categories: PIZZERIA_RESOLVED,
    });

    expect(repo.createWithMenuAndCategories).toHaveBeenCalledWith({
      ownerUserId: userId,
      displayName: DEFAULT_DISPLAY_NAME,
      slug: generateSlug(userId),
      categories: PIZZERIA_RESOLVED,
      restaurantType: "PIZZERIA",
    });
  });
});
