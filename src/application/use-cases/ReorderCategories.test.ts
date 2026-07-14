import { describe, it, expect, vi } from "vitest";
import { ReorderCategories } from "./ReorderCategories";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";

const EXISTING = [
  { id: "cat-1", name: "Entrées" },
  { id: "cat-2", name: "Plats" },
  { id: "cat-3", name: "Desserts" },
];

describe("ReorderCategories", () => {
  it("reorders when ids match the existing set", async () => {
    const repo = createMockMenuRepo({ listCategoryNames: vi.fn(async () => EXISTING) });
    const uc = new ReorderCategories(repo);

    await uc.execute({
      restaurantId: "resto-1",
      menuId: "menu-1",
      orderedIds: ["cat-3", "cat-1", "cat-2"],
    });

    expect(repo.reorderCategories).toHaveBeenCalledWith({
      menuId: "menu-1",
      restaurantId: "resto-1",
      orderedIds: ["cat-3", "cat-1", "cat-2"],
    });
    expect(repo.markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("refuses empty list", async () => {
    const uc = new ReorderCategories(createMockMenuRepo());
    await expect(
      uc.execute({ restaurantId: "resto-1", menuId: "menu-1", orderedIds: [] }),
    ).rejects.toMatchObject({ name: "DomainError", code: "empty_list" });
  });

  it("refuses if menu does not belong to restaurant", async () => {
    const repo = createMockMenuRepo({ verifyMenuOwnership: vi.fn(async () => false) });
    const uc = new ReorderCategories(repo);

    await expect(
      uc.execute({ restaurantId: "resto-1", menuId: "menu-1", orderedIds: ["cat-1"] }),
    ).rejects.toMatchObject({ name: "DomainError", code: "ownership_mismatch" });
    expect(repo.reorderCategories).not.toHaveBeenCalled();
    expect(repo.markMenuAsDraft).not.toHaveBeenCalled();
  });

  it("refuses if orderedIds is missing existing categories", async () => {
    const repo = createMockMenuRepo({ listCategoryNames: vi.fn(async () => EXISTING) });
    const uc = new ReorderCategories(repo);

    await expect(
      uc.execute({
        restaurantId: "resto-1",
        menuId: "menu-1",
        orderedIds: ["cat-1", "cat-2"], // cat-3 missing
      }),
    ).rejects.toMatchObject({ name: "DomainError", code: "list_mismatch" });
  });

  it("refuses if orderedIds contains foreign id", async () => {
    const repo = createMockMenuRepo({ listCategoryNames: vi.fn(async () => EXISTING) });
    const uc = new ReorderCategories(repo);

    await expect(
      uc.execute({
        restaurantId: "resto-1",
        menuId: "menu-1",
        orderedIds: ["cat-1", "cat-2", "cat-INTRUDER"],
      }),
    ).rejects.toMatchObject({ name: "DomainError", code: "list_mismatch" });
  });
});
