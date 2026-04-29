import { describe, it, expect, vi } from "vitest";
import { DeleteCategory } from "./DeleteCategory";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";

const VALID_INPUT = {
  restaurantId: "resto-1",
  categoryId: "cat-1",
};

describe("DeleteCategory", () => {
  it("deletes when more than one category exists", async () => {
    const repo = createMockMenuRepo({
      listCategoryNames: vi.fn(async () => [
        { id: "cat-1", name: "Plats" },
        { id: "cat-2", name: "Desserts" },
      ]),
    });
    const uc = new DeleteCategory(repo);

    await uc.execute(VALID_INPUT);

    expect(repo.deleteCategory).toHaveBeenCalledWith({
      categoryId: "cat-1",
      restaurantId: "resto-1",
    });
  });

  it("refuses to delete the last remaining category", async () => {
    const repo = createMockMenuRepo({
      listCategoryNames: vi.fn(async () => [{ id: "cat-1", name: "Plats" }]),
    });
    const uc = new DeleteCategory(repo);

    await expect(uc.execute(VALID_INPUT)).rejects.toThrow(
      "Vous devez garder au moins une catégorie",
    );
    expect(repo.deleteCategory).not.toHaveBeenCalled();
  });

  it("refuses if category does not belong to restaurant", async () => {
    const repo = createMockMenuRepo({ verifyCategoryOwnership: vi.fn(async () => false) });
    const uc = new DeleteCategory(repo);

    await expect(uc.execute(VALID_INPUT)).rejects.toThrow(
      "Cette catégorie n'appartient pas à ce restaurant",
    );
    expect(repo.deleteCategory).not.toHaveBeenCalled();
  });
});
