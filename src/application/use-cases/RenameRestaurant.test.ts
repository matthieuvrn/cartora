import { describe, it, expect } from "vitest";
import { RenameRestaurant } from "./RenameRestaurant";
import { createMockRestaurantRepo } from "./__fixtures__/restaurantRepoMock";

describe("RenameRestaurant", () => {
  it("updates display name with valid input", async () => {
    const repo = createMockRestaurantRepo();
    const uc = new RenameRestaurant(repo);

    await uc.execute({ restaurantId: "resto-1", displayName: "Chez Marcel" });

    expect(repo.updateDisplayName).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      displayName: "Chez Marcel",
    });
  });

  it("trims whitespace before saving", async () => {
    const repo = createMockRestaurantRepo();
    const uc = new RenameRestaurant(repo);

    await uc.execute({ restaurantId: "resto-1", displayName: "  Chez Marcel  " });

    expect(repo.updateDisplayName).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      displayName: "Chez Marcel",
    });
  });

  it("throws when display name is empty", async () => {
    const uc = new RenameRestaurant(createMockRestaurantRepo());

    await expect(uc.execute({ restaurantId: "resto-1", displayName: "" })).rejects.toMatchObject({
      name: "DomainError",
      code: "display_name_required",
    });
  });

  it("throws when display name is whitespace-only", async () => {
    const uc = new RenameRestaurant(createMockRestaurantRepo());

    await expect(uc.execute({ restaurantId: "resto-1", displayName: "   " })).rejects.toMatchObject(
      { name: "DomainError", code: "display_name_required" },
    );
  });

  it("truncates and accepts a very long name", async () => {
    const repo = createMockRestaurantRepo();
    const uc = new RenameRestaurant(repo);

    await uc.execute({ restaurantId: "resto-1", displayName: "a".repeat(200) });

    expect(repo.updateDisplayName).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      displayName: "a".repeat(50),
    });
  });
});
