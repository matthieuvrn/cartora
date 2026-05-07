import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import { CategoryPolicy } from "@/domain/menu/CategoryPolicy";
import { DomainError } from "@/domain/errors/DomainError";

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
    if (nameError) throw new DomainError(nameError.code, { field: nameError.field });

    const isOwned = await this.repo.verifyMenuOwnership(input.menuId, input.restaurantId);
    if (!isOwned) throw new DomainError("ownership_mismatch", { entityId: input.menuId });

    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    const existing = await this.repo.listCategoryNames(input.menuId);
    if (!CategoryPolicy.canAddCategory(existing.length, restaurant.planTier)) {
      const max = CategoryPolicy.maxFor(restaurant.planTier);
      throw new DomainError("max_categories", {
        limit: max,
        current: existing.length,
        tier: restaurant.planTier,
      });
    }
    if (CategoryPolicy.isDuplicateName(existing, name)) {
      throw new DomainError("duplicate_name", { field: "name" });
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
