import { describe, it, expect, vi } from "vitest";
import { ReorderDailyEntries } from "./ReorderDailyEntries";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";

describe("ReorderDailyEntries", () => {
  it("delegates the ordered list to the repo and marks menu as draft", async () => {
    const reorderDailyEntries = vi.fn(async () => {});
    const markMenuAsDraft = vi.fn(async () => {});
    const menuRepo = createMockMenuRepo({ reorderDailyEntries, markMenuAsDraft });
    const uc = new ReorderDailyEntries(menuRepo);

    await uc.execute({
      restaurantId: "resto-1",
      orderedIds: ["daily-2", "daily-1", "daily-3"],
    });

    expect(reorderDailyEntries).toHaveBeenCalledWith({
      restaurantId: "resto-1",
      orderedIds: ["daily-2", "daily-1", "daily-3"],
    });
    expect(markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("throws empty_list when orderedIds is empty", async () => {
    const uc = new ReorderDailyEntries(createMockMenuRepo());

    await expect(uc.execute({ restaurantId: "resto-1", orderedIds: [] })).rejects.toMatchObject({
      name: "DomainError",
      code: "empty_list",
    });
  });
});
