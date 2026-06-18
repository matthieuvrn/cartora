import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { StorageService } from "@/application/ports/StorageService";
import type { MenuLocale } from "@/domain/menu/MenuLocale";
import { ItemPhotoPolicy } from "@/domain/menu/ItemPhotoPolicy";
import { DomainError } from "@/domain/errors/DomainError";

export type SetDailyDishImageInput = {
  restaurantId: string;
  dishId: string;
  imagePath: string;
  /** Langue de saisie (S4) — l'alt-text est écrit dans cette locale uniquement. */
  sourceLocale: MenuLocale;
  altText?: string;
};

export class SetDailyDishImage {
  constructor(
    private readonly repo: MenuRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(input: SetDailyDishImageInput): Promise<void> {
    const dish = await this.repo.getDailyDish({
      dishId: input.dishId,
      restaurantId: input.restaurantId,
    });
    if (!dish) throw new DomainError("item_not_found", { entityId: input.dishId });

    const expectedPrefix = `${input.restaurantId}/daily/`;
    if (!input.imagePath.startsWith(expectedPrefix)) {
      throw new DomainError("invalid_image_path");
    }

    const altText = ItemPhotoPolicy.validateAltText(input.altText ?? "").ok;

    if (dish.imagePath && dish.imagePath !== input.imagePath) {
      try {
        await this.storage.delete(dish.imagePath);
      } catch {
        // Non-fatal — on met quand même à jour la DB pour la cohérence visuelle.
      }
    }

    await this.repo.updateDailyDishImage({
      dishId: input.dishId,
      restaurantId: input.restaurantId,
      imagePath: input.imagePath,
      sourceLocale: input.sourceLocale,
      altText: altText || null,
    });

    await this.repo.markMenuAsDraft(input.restaurantId);
  }
}
