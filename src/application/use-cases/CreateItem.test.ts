import { describe, it, expect, vi } from "vitest";
import { CreateItem } from "./CreateItem";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";

const VALID_INPUT = {
  categoryId: "cat-1",
  restaurantId: "resto-1",
  priceCents: 1200,
  badge: "NEW" as const,
  sourceLocale: "fr" as const,
  name: "Salade César",
  description: "Laitue, parmesan",
};

describe("CreateItem", () => {
  it("creates an item with valid input (source locale only)", async () => {
    const repo = createMockMenuRepo();
    const uc = new CreateItem(repo);

    const result = await uc.execute(VALID_INPUT);

    expect(result).toEqual({ itemId: "new-item-id" });
    expect(repo.markMenuAsDraft).toHaveBeenCalledWith("resto-1");
    expect(repo.getNextItemOrder).toHaveBeenCalledWith("cat-1");
    expect(repo.createItem).toHaveBeenCalledWith({
      categoryId: "cat-1",
      restaurantId: "resto-1",
      priceCents: 1200,
      badge: "NEW",
      allergens: [],
      isAvailable: true,
      order: 3,
      sourceLocale: "fr",
      texts: { name: "Salade César", description: "Laitue, parmesan" },
    });
  });

  it("propagates allergens to the repo", async () => {
    const repo = createMockMenuRepo();
    const uc = new CreateItem(repo);

    await uc.execute({ ...VALID_INPUT, allergens: ["GLUTEN", "EGGS"] });

    expect(repo.createItem).toHaveBeenCalledWith({
      categoryId: "cat-1",
      restaurantId: "resto-1",
      priceCents: 1200,
      badge: "NEW",
      allergens: ["GLUTEN", "EGGS"],
      isAvailable: true,
      order: 3,
      sourceLocale: "fr",
      texts: { name: "Salade César", description: "Laitue, parmesan" },
    });
  });

  it("passes a non-fr source locale through to the repo", async () => {
    const repo = createMockMenuRepo();
    const uc = new CreateItem(repo);

    await uc.execute({ ...VALID_INPUT, sourceLocale: "en", name: "Caesar Salad" });

    expect(repo.createItem).toHaveBeenCalledWith({
      categoryId: "cat-1",
      restaurantId: "resto-1",
      priceCents: 1200,
      badge: "NEW",
      allergens: [],
      isAvailable: true,
      order: 3,
      sourceLocale: "en",
      texts: { name: "Caesar Salad", description: "Laitue, parmesan" },
    });
  });

  it("rejects an invalid allergen value", async () => {
    const uc = new CreateItem(createMockMenuRepo());

    await expect(
      uc.execute({ ...VALID_INPUT, allergens: ["GLUTEN", "PEPPER"] }),
    ).rejects.toMatchObject({ name: "DomainError", code: "invalid_allergen" });
  });

  it("throws when name is empty", async () => {
    const uc = new CreateItem(createMockMenuRepo());

    await expect(uc.execute({ ...VALID_INPUT, name: "", description: "" })).rejects.toMatchObject({
      name: "DomainError",
      code: "name_required",
      metadata: { field: "name" },
    });
  });

  it("throws when price is negative", async () => {
    const uc = new CreateItem(createMockMenuRepo());

    await expect(uc.execute({ ...VALID_INPUT, priceCents: -1 })).rejects.toMatchObject({
      name: "DomainError",
      code: "price_too_low",
    });
  });

  it("throws when badge is invalid", async () => {
    const uc = new CreateItem(createMockMenuRepo());

    await expect(uc.execute({ ...VALID_INPUT, badge: "TRENDING" })).rejects.toMatchObject({
      name: "DomainError",
      code: "invalid_badge",
    });
  });

  it("throws when categoryId does not belong to restaurantId", async () => {
    const repo = createMockMenuRepo({
      verifyCategoryOwnership: vi.fn(async () => false),
    });
    const uc = new CreateItem(repo);

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "ownership_mismatch",
    });
    expect(repo.createItem).not.toHaveBeenCalled();
    expect(repo.markMenuAsDraft).not.toHaveBeenCalled();
  });

  it("calls verifyCategoryOwnership with correct arguments", async () => {
    const repo = createMockMenuRepo();
    const uc = new CreateItem(repo);

    await uc.execute(VALID_INPUT);

    expect(repo.verifyCategoryOwnership).toHaveBeenCalledWith("cat-1", "resto-1");
  });
});
