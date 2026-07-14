import { describe, it, expect } from "vitest";
import { DeleteItem } from "./DeleteItem";
import { createMockMenuRepo } from "./__fixtures__/menuRepoMock";

describe("DeleteItem", () => {
  it("delegates to repo.deleteItem", async () => {
    const repo = createMockMenuRepo();
    const uc = new DeleteItem(repo);

    await uc.execute({ itemId: "item-1", restaurantId: "resto-1" });

    expect(repo.deleteItem).toHaveBeenCalledWith({ itemId: "item-1", restaurantId: "resto-1" });
    expect(repo.markMenuAsDraft).toHaveBeenCalledWith("resto-1");
  });

  it("scopes the delete to the restaurant (ownership enforced by the repo)", async () => {
    const repo = createMockMenuRepo();
    const uc = new DeleteItem(repo);

    await uc.execute({ itemId: "item-x", restaurantId: "resto-1" });

    expect(repo.deleteItem).toHaveBeenCalledWith({ itemId: "item-x", restaurantId: "resto-1" });
  });
});
