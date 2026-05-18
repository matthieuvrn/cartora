import type { MenuRepository } from "@/application/ports/MenuRepository";
import { DomainError } from "@/domain/errors/DomainError";

export type ReorderDailyEntriesInput = {
  restaurantId: string;
  orderedIds: string[];
};

export class ReorderDailyEntries {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: ReorderDailyEntriesInput): Promise<void> {
    if (input.orderedIds.length === 0) {
      throw new DomainError("empty_list", { field: "orderedIds" });
    }

    await this.repo.reorderDailyEntries({
      restaurantId: input.restaurantId,
      orderedIds: input.orderedIds,
    });

    await this.repo.markMenuAsDraft(input.restaurantId);
  }
}
