import { describe, it, expect, vi } from "vitest";
import { RenameCategory } from "./RenameCategory";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";

const VALID_INPUT = {
  restaurantId: "resto-1",
  categoryId: "cat-1",
  name: "Plats principaux",
};

describe("RenameCategory", () => {
  it("renames with valid input", async () => {
    const repo = createMockMenuRepo({
      listCategoryNames: vi.fn(async () => [
        { id: "cat-1", name: "Plats" },
        { id: "cat-2", name: "Desserts" },
      ]),
    });
    const uc = new RenameCategory(repo);

    await uc.execute(VALID_INPUT);

    expect(repo.renameCategory).toHaveBeenCalledWith({
      categoryId: "cat-1",
      restaurantId: "resto-1",
      name: "Plats principaux",
    });
  });

  it("refuses if category does not belong to restaurant", async () => {
    const repo = createMockMenuRepo({ verifyCategoryOwnership: vi.fn(async () => false) });
    const uc = new RenameCategory(repo);

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "ownership_mismatch",
    });
    expect(repo.renameCategory).not.toHaveBeenCalled();
  });

  it("refuses duplicate name", async () => {
    const repo = createMockMenuRepo({
      listCategoryNames: vi.fn(async () => [
        { id: "cat-1", name: "Plats" },
        { id: "cat-2", name: "Desserts" },
      ]),
    });
    const uc = new RenameCategory(repo);

    await expect(uc.execute({ ...VALID_INPUT, name: "Desserts" })).rejects.toMatchObject({
      name: "DomainError",
      code: "duplicate_name",
    });
    expect(repo.renameCategory).not.toHaveBeenCalled();
  });

  it("allows renaming to its own current name (excluding self)", async () => {
    const repo = createMockMenuRepo({
      listCategoryNames: vi.fn(async () => [
        { id: "cat-1", name: "Plats" },
        { id: "cat-2", name: "Desserts" },
      ]),
    });
    const uc = new RenameCategory(repo);

    await uc.execute({ ...VALID_INPUT, name: "Plats" });

    expect(repo.renameCategory).toHaveBeenCalledWith(expect.objectContaining({ name: "Plats" }));
  });

  it("refuses empty name", async () => {
    const uc = new RenameCategory(createMockMenuRepo());
    await expect(uc.execute({ ...VALID_INPUT, name: "" })).rejects.toMatchObject({
      name: "DomainError",
      code: "name_required",
    });
  });
});
