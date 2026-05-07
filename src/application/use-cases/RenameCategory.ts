import type { MenuRepository } from "@/application/ports/MenuRepository";
import { CategoryPolicy } from "@/domain/menu/CategoryPolicy";
import { DomainError } from "@/domain/errors/DomainError";

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
    if (nameError) throw new DomainError(nameError.code, { field: nameError.field });

    const isOwned = await this.repo.verifyCategoryOwnership(input.categoryId, input.restaurantId);
    if (!isOwned) throw new DomainError("ownership_mismatch", { entityId: input.categoryId });

    const menuId = await this.repo.getMenuIdByRestaurantId(input.restaurantId);
    if (!menuId) throw new DomainError("menu_not_found", { entityId: input.restaurantId });

    const existing = await this.repo.listCategoryNames(menuId);
    if (CategoryPolicy.isDuplicateName(existing, name, input.categoryId)) {
      throw new DomainError("duplicate_name", { field: "name" });
    }

    await this.repo.renameCategory({
      categoryId: input.categoryId,
      restaurantId: input.restaurantId,
      name,
    });
  }
}
