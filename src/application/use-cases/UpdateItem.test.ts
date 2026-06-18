import { describe, it, expect } from "vitest";
import { UpdateItem } from "./UpdateItem";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";

const VALID_INPUT = {
  itemId: "item-1",
  restaurantId: "resto-1",
  priceCents: 1500,
  badge: "POPULAR" as const,
  isAvailable: true,
  sourceLocale: "fr" as const,
  name: "Tartare de bœuf",
  description: "Servi avec frites",
};

describe("UpdateItem", () => {
  it("updates an item with valid input (source locale only)", async () => {
    const repo = createMockMenuRepo();
    const uc = new UpdateItem(repo);

    await uc.execute(VALID_INPUT);

    expect(repo.updateItem).toHaveBeenCalledWith({
      itemId: "item-1",
      restaurantId: "resto-1",
      priceCents: 1500,
      badge: "POPULAR",
      allergens: [],
      isAvailable: true,
      sourceLocale: "fr",
      texts: { name: "Tartare de bœuf", description: "Servi avec frites" },
    });
  });

  it("propagates allergens to the repo", async () => {
    const repo = createMockMenuRepo();
    const uc = new UpdateItem(repo);

    await uc.execute({ ...VALID_INPUT, allergens: ["MILK", "NUTS"] });

    expect(repo.updateItem).toHaveBeenCalledWith({
      itemId: "item-1",
      restaurantId: "resto-1",
      priceCents: 1500,
      badge: "POPULAR",
      allergens: ["MILK", "NUTS"],
      isAvailable: true,
      sourceLocale: "fr",
      texts: { name: "Tartare de bœuf", description: "Servi avec frites" },
    });
  });

  it("rejects an invalid allergen value", async () => {
    const uc = new UpdateItem(createMockMenuRepo());

    await expect(
      uc.execute({ ...VALID_INPUT, allergens: ["MILK", "BANANA"] }),
    ).rejects.toMatchObject({ name: "DomainError", code: "invalid_allergen" });
  });

  it("passes isAvailable false through", async () => {
    const repo = createMockMenuRepo();
    const uc = new UpdateItem(repo);

    await uc.execute({ ...VALID_INPUT, isAvailable: false });

    expect(repo.updateItem).toHaveBeenCalledWith({
      itemId: "item-1",
      restaurantId: "resto-1",
      priceCents: 1500,
      badge: "POPULAR",
      allergens: [],
      isAvailable: false,
      sourceLocale: "fr",
      texts: { name: "Tartare de bœuf", description: "Servi avec frites" },
    });
  });

  it("sanitizes name/description before persisting (empty description allowed)", async () => {
    const repo = createMockMenuRepo();
    const uc = new UpdateItem(repo);

    await uc.execute({ ...VALID_INPUT, name: "  Soupe  ", description: "" });

    expect(repo.updateItem).toHaveBeenCalledWith({
      itemId: "item-1",
      restaurantId: "resto-1",
      priceCents: 1500,
      badge: "POPULAR",
      allergens: [],
      isAvailable: true,
      sourceLocale: "fr",
      texts: { name: "Soupe", description: "" },
    });
  });

  it("throws when name is empty", async () => {
    const uc = new UpdateItem(createMockMenuRepo());

    await expect(uc.execute({ ...VALID_INPUT, name: "  ", description: "" })).rejects.toMatchObject(
      { name: "DomainError", code: "name_required" },
    );
  });

  it("throws when price is negative", async () => {
    const uc = new UpdateItem(createMockMenuRepo());

    await expect(uc.execute({ ...VALID_INPUT, priceCents: -5 })).rejects.toMatchObject({
      name: "DomainError",
      code: "price_too_low",
    });
  });

  it("throws when badge is invalid", async () => {
    const uc = new UpdateItem(createMockMenuRepo());

    await expect(uc.execute({ ...VALID_INPUT, badge: "UNKNOWN" })).rejects.toMatchObject({
      name: "DomainError",
      code: "invalid_badge",
    });
  });
});
