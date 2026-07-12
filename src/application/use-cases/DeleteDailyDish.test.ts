import { describe, it, expect, vi } from "vitest";
import { DeleteDailyDish } from "./DeleteDailyDish";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";

describe("DeleteDailyDish", () => {
  it("deletes dish and marks menu as draft", async () => {
    const deleteDailyDish = vi.fn(async () => {});
    const markMenuAsDraft = vi.fn(async () => {});
    const menuRepo = createMockMenuRepo({
      getDailyDish: async () => ({ id: "daily-1" }),
      deleteDailyDish,
      markMenuAsDraft,
    });
    const uc = new DeleteDailyDish(menuRepo);

    await uc.execute({ dishId: "daily-1", restaurantId: "resto-1" });

    expect(deleteDailyDish).toHaveBeenCalledWith({
      dishId: "daily-1",
      restaurantId: "resto-1",
    });
    expect(markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("throws item_not_found when dish does not belong to restaurant", async () => {
    const menuRepo = createMockMenuRepo({ getDailyDish: async () => null });
    const uc = new DeleteDailyDish(menuRepo);

    await expect(uc.execute({ dishId: "daily-1", restaurantId: "resto-1" })).rejects.toMatchObject({
      name: "DomainError",
      code: "item_not_found",
    });
  });
});
