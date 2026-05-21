import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { StorageService } from "@/application/ports/StorageService";
import { DomainError } from "@/domain/errors/DomainError";

export type DeleteDailyDishInput = {
  dishId: string;
  restaurantId: string;
};

export class DeleteDailyDish {
  constructor(
    private readonly repo: MenuRepository,
    private readonly itemImageStorage: StorageService,
  ) {}

  async execute(input: DeleteDailyDishInput): Promise<void> {
    const dish = await this.repo.getDailyDish({
      dishId: input.dishId,
      restaurantId: input.restaurantId,
    });
    if (!dish) throw new DomainError("item_not_found", { entityId: input.dishId });

    if (dish.imagePath) {
      try {
        await this.itemImageStorage.delete(dish.imagePath);
      } catch {
        // Non-fatal : on supprime quand même la ligne pour honorer l'intention utilisateur.
      }
    }

    await this.repo.deleteDailyDish({ dishId: input.dishId, restaurantId: input.restaurantId });
    await this.repo.markMenuAsDraft(input.restaurantId);
  }
}
