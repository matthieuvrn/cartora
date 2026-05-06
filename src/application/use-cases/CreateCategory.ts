import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
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
  constructor(
    private readonly repo: MenuRepository,
    private readonly restaurantRepo: RestaurantRepository,
  ) {}

  async execute(input: CreateCategoryInput): Promise<CreateCategoryOutput> {
    const name = CategoryPolicy.sanitizeName(input.name);
    const nameError = CategoryPolicy.validateName(name);
    if (nameError) throw new Error(nameError);

    const isOwned = await this.repo.verifyMenuOwnership(input.menuId, input.restaurantId);
    if (!isOwned) throw new Error("Ce menu n'appartient pas à ce restaurant");

    // Lookup tier pour appliquer le quota correspondant. Les errors max_categories_*
    // sont catchées par l'action layer pour afficher un CTA upgrade.
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) throw new Error("Restaurant introuvable");

    const existing = await this.repo.listCategoryNames(input.menuId);
    if (!CategoryPolicy.canAddCategory(existing.length, restaurant.planTier)) {
      const max = CategoryPolicy.maxFor(restaurant.planTier);
      throw new Error(`max_categories_${max}`);
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
