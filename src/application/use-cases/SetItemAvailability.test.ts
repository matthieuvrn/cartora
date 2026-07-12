import { describe, it, expect } from "vitest";
import { SetItemAvailability } from "./SetItemAvailability";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";

describe("SetItemAvailability", () => {
  it("persists the new availability and marks the menu as draft", async () => {
    const repo = createMockMenuRepo();
    const uc = new SetItemAvailability(repo);

    await uc.execute({ restaurantId: "resto-1", itemId: "item-2", isAvailable: false });

    expect(repo.updateItemAvailability).toHaveBeenCalledWith({
      itemId: "item-2",
      restaurantId: "resto-1",
      isAvailable: false,
    });
    expect(repo.markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("re-enables an item the same way (isAvailable: true)", async () => {
    const repo = createMockMenuRepo();
    const uc = new SetItemAvailability(repo);

    await uc.execute({ restaurantId: "resto-1", itemId: "item-2", isAvailable: true });

    expect(repo.updateItemAvailability).toHaveBeenCalledWith({
      itemId: "item-2",
      restaurantId: "resto-1",
      isAvailable: true,
    });
  });

  it("rejects unknown item without mutating anything", async () => {
    const repo = createMockMenuRepo({ getItem: async () => null });
    const uc = new SetItemAvailability(repo);

    await expect(
      uc.execute({ restaurantId: "resto-1", itemId: "item-x", isAvailable: false }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "item_not_found",
      metadata: { entityId: "item-x" },
    });
    expect(repo.updateItemAvailability).not.toHaveBeenCalled();
    expect(repo.markMenuAsDraft).not.toHaveBeenCalled();
  });
});
