import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { StorageService } from "@/application/ports/StorageService";
import { DomainError } from "@/domain/errors/DomainError";

export type DeleteDailyDishImageInput = {
  restaurantId: string;
  dishId: string;
};

export class DeleteDailyDishImage {
  constructor(
    private readonly repo: MenuRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(input: DeleteDailyDishImageInput): Promise<void> {
    const entry = await this.repo.getDailyDish({
      dishId: input.dishId,
      restaurantId: input.restaurantId,
    });
    if (!entry) throw new DomainError("item_not_found", { entityId: input.dishId });

    if (entry.imagePath) {
      try {
        await this.storage.delete(entry.imagePath);
      } catch {
        // Non-fatal — la DB est mise à jour pour stopper l'affichage d'une image cassée.
      }
    }

    // `imagePath: null` ⇒ le repo purge aussi les alt-texts de toutes les locales.
    await this.repo.updateDailyDishImage({
      dishId: input.dishId,
      restaurantId: input.restaurantId,
      imagePath: null,
      sourceLocale: "fr",
      altText: null,
    });

    await this.repo.markMenuAsDraft(input.restaurantId);
  }
}
