import type { MenuRepository } from "@/application/ports/MenuRepository";
import { DomainError } from "@/domain/errors/DomainError";

export type ReorderCategoriesInput = {
  restaurantId: string;
  menuId: string;
  orderedIds: string[];
};

export class ReorderCategories {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: ReorderCategoriesInput): Promise<void> {
    if (input.orderedIds.length === 0) {
      throw new DomainError("empty_list", { field: "orderedIds" });
    }

    const isOwned = await this.repo.verifyMenuOwnership(input.menuId, input.restaurantId);
    if (!isOwned) throw new DomainError("ownership_mismatch", { entityId: input.menuId });

    const existing = await this.repo.listCategoryNames(input.menuId);
    const existingIds = new Set(existing.map((c) => c.id));
    const requestedIds = new Set(input.orderedIds);

    if (
      existingIds.size !== requestedIds.size ||
      [...existingIds].some((id) => !requestedIds.has(id))
    ) {
      throw new DomainError("list_mismatch", {
        expected: existingIds.size,
        received: requestedIds.size,
      });
    }

    await this.repo.reorderCategories({
      menuId: input.menuId,
      restaurantId: input.restaurantId,
      orderedIds: input.orderedIds,
    });
  }
}
