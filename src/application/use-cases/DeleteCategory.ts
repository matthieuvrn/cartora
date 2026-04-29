import type { MenuRepository } from "@/application/ports/MenuRepository";

export type DeleteCategoryInput = {
  restaurantId: string;
  categoryId: string;
};

export class DeleteCategory {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: DeleteCategoryInput): Promise<void> {
    const isOwned = await this.repo.verifyCategoryOwnership(input.categoryId, input.restaurantId);
    if (!isOwned) throw new Error("Cette catégorie n'appartient pas à ce restaurant");

    const menuId = await this.repo.getMenuIdByRestaurantId(input.restaurantId);
    if (!menuId) throw new Error("Menu introuvable");

    const existing = await this.repo.listCategoryNames(menuId);
    if (existing.length <= 1) {
      throw new Error("Vous devez garder au moins une catégorie");
    }

    await this.repo.deleteCategory({
      categoryId: input.categoryId,
      restaurantId: input.restaurantId,
    });
  }
}
