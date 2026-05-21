import { describe, it, expect, vi } from "vitest";
import { ReorderDailyDishes } from "./ReorderDailyDishes";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";

describe("ReorderDailyDishes", () => {
  it("delegates the ordered list to the repo and marks menu as draft", async () => {
    const reorderDailyDishes = vi.fn(async () => {});
    const markMenuAsDraft = vi.fn(async () => {});
    const menuRepo = createMockMenuRepo({ reorderDailyDishes, markMenuAsDraft });
    const uc = new ReorderDailyDishes(menuRepo);

    await uc.execute({
      restaurantId: "resto-1",
      orderedIds: ["daily-2", "daily-1", "daily-3"],
    });

    expect(reorderDailyDishes).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      orderedIds: ["daily-2", "daily-1", "daily-3"],
    });
    expect(markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("throws empty_list when orderedIds is empty", async () => {
    const uc = new ReorderDailyDishes(createMockMenuRepo());

    await expect(uc.execute({ restaurantId: "resto-1", orderedIds: [] })).rejects.toMatchObject({
      name: "DomainError",
      code: "empty_list",
    });
  });
});
