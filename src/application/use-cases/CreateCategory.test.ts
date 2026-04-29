import { describe, it, expect, vi } from "vitest";
import { CreateCategory } from "./CreateCategory";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";
import { MAX_CATEGORIES } from "@/domain/menu/CategoryPolicy";

const VALID_INPUT = {
  restaurantId: "resto-1",
  menuId: "menu-1",
  name: "Tapas",
};

describe("CreateCategory", () => {
  it("creates with valid input", async () => {
    const repo = createMockMenuRepo({
      listCategoryNames: vi.fn(async () => [
        { id: "a", name: "Entrées" },
        { id: "b", name: "Plats" },
      ]),
    });
    const uc = new CreateCategory(repo);

    const result = await uc.execute(VALID_INPUT);

    expect(result).toEqual({ categoryId: "new-cat-id" });
    expect(repo.createCategory).toHaveBeenCalledWith({
      menuId: "menu-1",
      restaurantId: "resto-1",
      name: "Tapas",
      order: 2,
    });
  });

  it("sanitizes the name (trim + collapse spaces)", async () => {
    const repo = createMockMenuRepo();
    const uc = new CreateCategory(repo);

    await uc.execute({ ...VALID_INPUT, name: "  Plats   du   jour  " });

    expect(repo.createCategory).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Plats du jour" }),
    );
  });

  it("refuses empty name", async () => {
    const uc = new CreateCategory(createMockMenuRepo());
    await expect(uc.execute({ ...VALID_INPUT, name: "  " })).rejects.toThrow(
      "Le nom est obligatoire",
    );
  });

  it("refuses if menu does not belong to restaurant", async () => {
    const repo = createMockMenuRepo({ verifyMenuOwnership: vi.fn(async () => false) });
    const uc = new CreateCategory(repo);

    await expect(uc.execute(VALID_INPUT)).rejects.toThrow(
      "Ce menu n'appartient pas à ce restaurant",
    );
    expect(repo.createCategory).not.toHaveBeenCalled();
  });

  it("refuses past the cap", async () => {
    const existing = Array.from({ length: MAX_CATEGORIES }, (_, i) => ({
      id: `c${i}`,
      name: `Cat ${i}`,
    }));
    const repo = createMockMenuRepo({ listCategoryNames: vi.fn(async () => existing) });
    const uc = new CreateCategory(repo);

    await expect(uc.execute(VALID_INPUT)).rejects.toThrow("Limite de catégories atteinte");
    expect(repo.createCategory).not.toHaveBeenCalled();
  });

  it("refuses duplicate name (case + trim insensitive)", async () => {
    const repo = createMockMenuRepo({
      listCategoryNames: vi.fn(async () => [{ id: "a", name: "Tapas" }]),
    });
    const uc = new CreateCategory(repo);

    await expect(uc.execute({ ...VALID_INPUT, name: "  TAPAS  " })).rejects.toThrow(
      "Une catégorie avec ce nom existe déjà",
    );
    expect(repo.createCategory).not.toHaveBeenCalled();
  });
});
