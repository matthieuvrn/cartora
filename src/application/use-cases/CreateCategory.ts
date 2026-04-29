import type { MenuRepository } from "@/application/ports/MenuRepository";
import { CategoryPolicy } from "@/domain/menu/CategoryPolicy";

export type CreateCategoryInput = {
  restaurantId: string;
  menuId: string;
  name: string;
};

export type CreateCategoryOutput = {
  categoryId: string;
};

export class CreateCategory {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: CreateCategoryInput): Promise<CreateCategoryOutput> {
    const name = CategoryPolicy.sanitizeName(input.name);
    const nameError = CategoryPolicy.validateName(name);
    if (nameError) throw new Error(nameError);

    const isOwned = await this.repo.verifyMenuOwnership(input.menuId, input.restaurantId);
    if (!isOwned) throw new Error("Ce menu n'appartient pas à ce restaurant");

    const existing = await this.repo.listCategoryNames(input.menuId);
    if (!CategoryPolicy.canAddCategory(existing.length)) {
      throw new Error("Limite de catégories atteinte");
    }
    if (CategoryPolicy.isDuplicateName(existing, name)) {
      throw new Error("Une catégorie avec ce nom existe déjà");
    }

    const { id } = await this.repo.createCategory({
      menuId: input.menuId,
      restaurantId: input.restaurantId,
      name,
      order: existing.length,
    });

    return { categoryId: id };
  }
}
