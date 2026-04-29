import type { MenuRepository } from "@/application/ports/MenuRepository";
import { CategoryPolicy } from "@/domain/menu/CategoryPolicy";

export type RenameCategoryInput = {
  restaurantId: string;
  categoryId: string;
  name: string;
};

export class RenameCategory {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: RenameCategoryInput): Promise<void> {
    const name = CategoryPolicy.sanitizeName(input.name);
    const nameError = CategoryPolicy.validateName(name);
    if (nameError) throw new Error(nameError);

    const isOwned = await this.repo.verifyCategoryOwnership(input.categoryId, input.restaurantId);
    if (!isOwned) throw new Error("Cette catégorie n'appartient pas à ce restaurant");

    const menuId = await this.repo.getMenuIdByRestaurantId(input.restaurantId);
    if (!menuId) throw new Error("Menu introuvable");

    const existing = await this.repo.listCategoryNames(menuId);
    if (CategoryPolicy.isDuplicateName(existing, name, input.categoryId)) {
      throw new Error("Une catégorie avec ce nom existe déjà");
    }

    await this.repo.renameCategory({
      categoryId: input.categoryId,
      restaurantId: input.restaurantId,
      name,
    });
  }
}
