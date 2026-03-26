import type { MenuRepository } from "@/application/ports/MenuRepository";

export type ReorderItemsInput = {
  categoryId: string;
  restaurantId: string;
  itemIds: string[];
};

export class ReorderItems {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: ReorderItemsInput): Promise<void> {
    if (input.itemIds.length === 0) {
      throw new Error("La liste des items ne peut pas être vide");
    }

    await this.repo.reorderItems({
      categoryId: input.categoryId,
      restaurantId: input.restaurantId,
      itemIds: input.itemIds,
    });
  }
}
