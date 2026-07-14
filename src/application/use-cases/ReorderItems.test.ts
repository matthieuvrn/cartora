import { describe, it, expect, vi } from "vitest";
import { ReorderItems } from "./ReorderItems";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";

describe("ReorderItems", () => {
  it("delegates ordered list to repo", async () => {
    const repo = createMockMenuRepo();
    const uc = new ReorderItems(repo);

    await uc.execute({
      categoryId: "cat-1",
      restaurantId: "resto-1",
      itemIds: ["item-3", "item-1", "item-2"],
    });

    expect(repo.reorderItems).toHaveBeenCalledWith({
      categoryId: "cat-1",
      restaurantId: "resto-1",
      itemIds: ["item-3", "item-1", "item-2"],
    });
    expect(repo.markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("throws when itemIds is empty", async () => {
    const uc = new ReorderItems(createMockMenuRepo());

    await expect(
      uc.execute({ categoryId: "cat-1", restaurantId: "resto-1", itemIds: [] }),
    ).rejects.toMatchObject({ name: "DomainError", code: "empty_list" });
  });

  it("throws when categoryId does not belong to restaurantId", async () => {
    const repo = createMockMenuRepo({ verifyCategoryOwnership: vi.fn(async () => false) });
    const uc = new ReorderItems(repo);

    await expect(
      uc.execute({ categoryId: "cat-1", restaurantId: "resto-1", itemIds: ["item-1"] }),
    ).rejects.toMatchObject({ name: "DomainError", code: "ownership_mismatch" });
    expect(repo.reorderItems).not.toHaveBeenCalled();
    expect(repo.markMenuAsDraft).not.toHaveBeenCalled();
  });
});
