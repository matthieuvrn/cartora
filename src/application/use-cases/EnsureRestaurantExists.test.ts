import { describe, it, expect, vi } from "vitest";
import { EnsureRestaurantExists } from "./EnsureRestaurantExists";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import {
  DEFAULT_DISPLAY_NAME,
  INITIAL_CATEGORIES,
  generateSlug,
} from "@/domain/restaurant/RestaurantInitPolicy";

function createMockRepo(overrides: Partial<RestaurantRepository> = {}): RestaurantRepository {
  return {
    findByOwnerUserId: async () => null,
    createWithMenuAndCategories: vi.fn(async () => ({ id: "resto-new" })),
    getRestaurantById: async () => null,
    updateDisplayName: async () => {},
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

    const result = await uc.execute({ userId: "user-1" });

    expect(result).toEqual({ restaurantId: "resto-existing", created: false });
    expect(repo.createWithMenuAndCategories).not.toHaveBeenCalled();
  });

  it("creates a new restaurant with correct defaults when none exists", async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    const repo = createMockRepo();
    const uc = new EnsureRestaurantExists(repo);

    const result = await uc.execute({ userId });

    expect(result).toEqual({ restaurantId: "resto-new", created: true });
    expect(repo.createWithMenuAndCategories).toHaveBeenCalledWith({
      ownerUserId: userId,
      displayName: DEFAULT_DISPLAY_NAME,
      slug: generateSlug(userId),
      categories: [...INITIAL_CATEGORIES],
    });
  });
});
