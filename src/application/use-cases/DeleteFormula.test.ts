import { describe, it, expect, vi } from "vitest";
import { DeleteFormula } from "./DeleteFormula";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";

describe("DeleteFormula", () => {
  it("deletes formula and marks menu as draft", async () => {
    const deleteFormula = vi.fn(async () => {});
    const markMenuAsDraft = vi.fn(async () => {});
    const menuRepo = createMockMenuRepo({
      getFormula: async () => ({ id: "formula-1" }),
      deleteFormula,
      markMenuAsDraft,
    });
    const uc = new DeleteFormula(menuRepo);

    await uc.execute({ formulaId: "formula-1", restaurantId: "resto-1" });

    expect(deleteFormula).toHaveBeenCalledWith({
      formulaId: "formula-1",
      restaurantId: "resto-1",
    });
    expect(markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("throws item_not_found when formula does not belong to restaurant", async () => {
    const menuRepo = createMockMenuRepo({ getFormula: async () => null });
    const uc = new DeleteFormula(menuRepo);

    await expect(
      uc.execute({ formulaId: "formula-1", restaurantId: "resto-1" }),
    ).rejects.toMatchObject({ name: "DomainError", code: "item_not_found" });
  });
});
