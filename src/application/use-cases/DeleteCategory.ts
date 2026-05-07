import type { MenuRepository } from "@/application/ports/MenuRepository";
import { DomainError } from "@/domain/errors/DomainError";

export type DeleteCategoryInput = {
  restaurantId: string;
  categoryId: string;
};

export class DeleteCategory {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: DeleteCategoryInput): Promise<void> {
    const isOwned = await this.repo.verifyCategoryOwnership(input.categoryId, input.restaurantId);
    if (!isOwned) throw new DomainError("ownership_mismatch", { entityId: input.categoryId });

    const menuId = await this.repo.getMenuIdByRestaurantId(input.restaurantId);
    if (!menuId) throw new DomainError("menu_not_found", { entityId: input.restaurantId });

    const existing = await this.repo.listCategoryNames(menuId);
    if (existing.length <= 1) {
      throw new DomainError("must_keep_one_category");
    }

    await this.repo.deleteCategory({
      categoryId: input.categoryId,
      restaurantId: input.restaurantId,
    });
  }
}
