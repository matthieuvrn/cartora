import { describe, it, expect, vi } from "vitest";
import { ReorderFormulas } from "./ReorderFormulas";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";

describe("ReorderFormulas", () => {
  it("reorders formulas by the provided id list and marks menu as draft", async () => {
    const reorderFormulas = vi.fn(async () => {});
    const markMenuAsDraft = vi.fn(async () => {});
    const menuRepo = createMockMenuRepo({ reorderFormulas, markMenuAsDraft });
    const uc = new ReorderFormulas(menuRepo);

    await uc.execute({ restaurantId: "resto-1", orderedIds: ["b", "a", "c"] });

    expect(reorderFormulas).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      orderedIds: ["b", "a", "c"],
    });
    expect(markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("rejects empty list", async () => {
    const uc = new ReorderFormulas(createMockMenuRepo());

    await expect(uc.execute({ restaurantId: "resto-1", orderedIds: [] })).rejects.toMatchObject({
      name: "DomainError",
      code: "empty_list",
    });
  });
});
