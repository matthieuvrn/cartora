import type { MenuRepository } from "@/application/ports/MenuRepository";
import { DomainError } from "@/domain/errors/DomainError";

export type ReorderDailyDishesInput = {
  restaurantId: string;
  orderedIds: string[];
};

export class ReorderDailyDishes {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: ReorderDailyDishesInput): Promise<void> {
    if (input.orderedIds.length === 0) {
      throw new DomainError("empty_list", { field: "orderedIds" });
    }

    await this.repo.reorderDailyDishes({
      restaurantId: input.restaurantId,
      orderedIds: input.orderedIds,
    });

    await this.repo.markMenuAsDraft(input.restaurantId);
  }
}
