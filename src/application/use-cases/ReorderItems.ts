import type { MenuRepository } from "@/application/ports/MenuRepository";
import { DomainError } from "@/domain/errors/DomainError";

export type ReorderItemsInput = {
  categoryId: string;
  restaurantId: string;
  itemIds: string[];
};

export class ReorderItems {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: ReorderItemsInput): Promise<void> {
    if (input.itemIds.length === 0) {
      throw new DomainError("empty_list", { field: "itemIds" });
    }

    const isOwned = await this.repo.verifyCategoryOwnership(input.categoryId, input.restaurantId);
    if (!isOwned) throw new DomainError("ownership_mismatch", { entityId: input.categoryId });

    await this.repo.reorderItems({
      categoryId: input.categoryId,
      restaurantId: input.restaurantId,
      itemIds: input.itemIds,
    });
  }
}
