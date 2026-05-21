import type { MenuRepository } from "@/application/ports/MenuRepository";
import { DomainError } from "@/domain/errors/DomainError";

export type ReorderFormulasInput = {
  restaurantId: string;
  orderedIds: string[];
};

export class ReorderFormulas {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: ReorderFormulasInput): Promise<void> {
    if (input.orderedIds.length === 0) {
      throw new DomainError("empty_list", { field: "orderedIds" });
    }

    await this.repo.reorderFormulas({
      restaurantId: input.restaurantId,
      orderedIds: input.orderedIds,
    });

    await this.repo.markMenuAsDraft(input.restaurantId);
  }
}
