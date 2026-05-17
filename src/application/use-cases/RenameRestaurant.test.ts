import { describe, it, expect, vi } from "vitest";
import { RenameRestaurant } from "./RenameRestaurant";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";

function createMockRepo(overrides: Partial<RestaurantRepository> = {}): RestaurantRepository {
  return {
    findByOwnerUserId: async () => null,
    createWithMenuAndCategories: async () => ({ id: "id" }),
    getRestaurantById: async () => null,
    updateDisplayName: vi.fn(async () => {}),
    updateLogoPath: async () => {},
    markActivationDismissed: async () => {},
    delete: async () => {},
    ...overrides,
  };
}

describe("RenameRestaurant", () => {
  it("updates display name with valid input", async () => {
    const repo = createMockRepo();
    const uc = new RenameRestaurant(repo);

    await uc.execute({ restaurantId: "resto-1", displayName: "Chez Marcel" });

    expect(repo.updateDisplayName).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      displayName: "Chez Marcel",
    });
  });

  it("trims whitespace before saving", async () => {
    const repo = createMockRepo();
    const uc = new RenameRestaurant(repo);

    await uc.execute({ restaurantId: "resto-1", displayName: "  Chez Marcel  " });

    expect(repo.updateDisplayName).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      displayName: "Chez Marcel",
    });
  });

  it("throws when display name is empty", async () => {
    const uc = new RenameRestaurant(createMockRepo());

    await expect(uc.execute({ restaurantId: "resto-1", displayName: "" })).rejects.toMatchObject({
      name: "DomainError",
      code: "display_name_required",
    });
  });

  it("throws when display name is whitespace-only", async () => {
    const uc = new RenameRestaurant(createMockRepo());

    await expect(uc.execute({ restaurantId: "resto-1", displayName: "   " })).rejects.toMatchObject(
      { name: "DomainError", code: "display_name_required" },
    );
  });

  it("truncates and accepts a very long name", async () => {
    const repo = createMockRepo();
    const uc = new RenameRestaurant(repo);

    await uc.execute({ restaurantId: "resto-1", displayName: "a".repeat(200) });

    expect(repo.updateDisplayName).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: "a".repeat(50) }),
    );
  });
});
