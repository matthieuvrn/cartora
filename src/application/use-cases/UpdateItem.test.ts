import { describe, it, expect } from "vitest";
import { UpdateItem } from "./UpdateItem";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";

const VALID_INPUT = {
  itemId: "item-1",
  restaurantId: "resto-1",
  priceCents: 1500,
  badge: "POPULAR" as const,
  isAvailable: true,
  translations: {
    fr: { name: "Tartare de bœuf", description: "Servi avec frites" },
    en: { name: "Beef tartare", description: "Served with fries" },
  },
};

describe("UpdateItem", () => {
  it("updates an item with valid input", async () => {
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
      translations: {
        fr: { name: "Tartare de bœuf", description: "Servi avec frites" },
        en: { name: "Beef tartare", description: "Served with fries" },
      },
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
      translations: {
        fr: { name: "Tartare de bœuf", description: "Servi avec frites" },
        en: { name: "Beef tartare", description: "Served with fries" },
      },
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
      translations: {
        fr: { name: "Tartare de bœuf", description: "Servi avec frites" },
        en: { name: "Beef tartare", description: "Served with fries" },
      },
    });
  });

  it("defaults EN translations to empty strings when omitted", async () => {
    const repo = createMockMenuRepo();
    const uc = new UpdateItem(repo);

    await uc.execute({
      ...VALID_INPUT,
      translations: { fr: { name: "Soupe", description: "" } },
    });

    expect(repo.updateItem).toHaveBeenCalledWith({
      itemId: "item-1",
      restaurantId: "resto-1",
      priceCents: 1500,
      badge: "POPULAR",
      allergens: [],
      isAvailable: true,
      translations: {
        fr: { name: "Soupe", description: "" },
        en: { name: "", description: "" },
      },
    });
  });

  it("throws when FR name is empty", async () => {
    const uc = new UpdateItem(createMockMenuRepo());

    await expect(
      uc.execute({ ...VALID_INPUT, translations: { fr: { name: "  ", description: "" } } }),
    ).rejects.toMatchObject({ name: "DomainError", code: "name_required" });
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
