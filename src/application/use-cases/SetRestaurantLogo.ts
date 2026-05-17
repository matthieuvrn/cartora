import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { StorageService } from "@/application/ports/StorageService";
import { DomainError } from "@/domain/errors/DomainError";

export type SetRestaurantLogoInput = {
  restaurantId: string;
  logoPath: string;
};

export class SetRestaurantLogo {
  constructor(
    private readonly restaurantRepo: RestaurantRepository,
    private readonly menuRepo: MenuRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(input: SetRestaurantLogoInput): Promise<void> {
    const expectedPrefix = `${input.restaurantId}/`;
    if (!input.logoPath.startsWith(expectedPrefix)) {
      throw new DomainError("invalid_image_path");
    }

    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    // Si l'extension du nouveau logo diffère de l'ancien, supprime l'ancien fichier
    // pour éviter d'accumuler des orphelins. Quand l'extension est identique, l'upsert
    // Supabase écrase l'objet en place et on garde l'ancien path en base.
    if (restaurant.logoPath && restaurant.logoPath !== input.logoPath) {
      try {
        await this.storage.delete(restaurant.logoPath);
      } catch {
        // Non-fatal: on persiste quand même le nouveau chemin pour rester cohérent côté UI.
      }
    }

    await this.restaurantRepo.updateLogoPath({
      restaurantId: input.restaurantId,
      logoPath: input.logoPath,
    });

    await this.menuRepo.markMenuAsDraft(input.restaurantId);
  }
}
