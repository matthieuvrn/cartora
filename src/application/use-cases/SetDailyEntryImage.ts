import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { StorageService } from "@/application/ports/StorageService";
import { ItemPhotoPolicy } from "@/domain/menu/ItemPhotoPolicy";
import { DomainError } from "@/domain/errors/DomainError";

export type SetDailyEntryImageInput = {
  restaurantId: string;
  entryId: string;
  imagePath: string;
  altTextFr?: string;
  altTextEn?: string;
};

export class SetDailyEntryImage {
  constructor(
    private readonly repo: MenuRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(input: SetDailyEntryImageInput): Promise<void> {
    const entry = await this.repo.getDailyEntry({
      entryId: input.entryId,
      restaurantId: input.restaurantId,
    });
    if (!entry) throw new DomainError("item_not_found", { entityId: input.entryId });

    const expectedPrefix = `${input.restaurantId}/daily/`;
    if (!input.imagePath.startsWith(expectedPrefix)) {
      throw new DomainError("invalid_image_path");
    }

    const altFr = ItemPhotoPolicy.validateAltText(input.altTextFr ?? "").ok;
    const altEn = ItemPhotoPolicy.validateAltText(input.altTextEn ?? "").ok;

    if (entry.imagePath && entry.imagePath !== input.imagePath) {
      try {
        await this.storage.delete(entry.imagePath);
      } catch {
        // Non-fatal — on met quand même à jour la DB pour la cohérence visuelle.
      }
    }

    await this.repo.updateDailyEntryImage({
      entryId: input.entryId,
      restaurantId: input.restaurantId,
      imagePath: input.imagePath,
      altTextFr: altFr || null,
      altTextEn: altEn || null,
    });

    await this.repo.markMenuAsDraft(input.restaurantId);
  }
}
