import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { StorageService } from "@/application/ports/StorageService";
import { DomainError } from "@/domain/errors/DomainError";

export type DeleteRestaurantLogoInput = {
  restaurantId: string;
};

export class DeleteRestaurantLogo {
  constructor(
    private readonly restaurantRepo: RestaurantRepository,
    private readonly menuRepo: MenuRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(input: DeleteRestaurantLogoInput): Promise<void> {
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    if (restaurant.logoPath) {
      try {
        await this.storage.delete(restaurant.logoPath);
      } catch {
        // Non-fatal: on efface quand même la référence en base pour ne pas afficher
        // un logo cassé côté UI.
      }
    }

    await this.restaurantRepo.updateLogoPath({
      restaurantId: input.restaurantId,
      logoPath: null,
    });

    await this.menuRepo.markMenuAsDraft(input.restaurantId);
  }
}
