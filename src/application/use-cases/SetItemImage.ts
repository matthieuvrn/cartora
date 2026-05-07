import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { StorageService } from "@/application/ports/StorageService";
import { ItemPhotoPolicy } from "@/domain/menu/ItemPhotoPolicy";
import { DomainError } from "@/domain/errors/DomainError";

export type SetItemImageInput = {
  restaurantId: string;
  itemId: string;
  imagePath: string;
  altTextFr?: string;
  altTextEn?: string;
};

export class SetItemImage {
  constructor(
    private readonly repo: MenuRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(input: SetItemImageInput): Promise<void> {
    const item = await this.repo.getItem({
      itemId: input.itemId,
      restaurantId: input.restaurantId,
    });
    if (!item) throw new DomainError("item_not_found", { entityId: input.itemId });

    const expectedPrefix = `${input.restaurantId}/`;
    if (!input.imagePath.startsWith(expectedPrefix)) {
      throw new DomainError("invalid_image_path");
    }

    const altFr = ItemPhotoPolicy.validateAltText(input.altTextFr ?? "").ok;
    const altEn = ItemPhotoPolicy.validateAltText(input.altTextEn ?? "").ok;

    // If the previous image had a different storage path (e.g. the user uploaded a new
    // file with a different extension), drop the old object so we don't leave orphans.
    if (item.imagePath && item.imagePath !== input.imagePath) {
      try {
        await this.storage.delete(item.imagePath);
      } catch {
        // Non-fatal: we still update the DB so the user-visible state is consistent.
      }
    }

    await this.repo.updateItemImage({
      itemId: input.itemId,
      restaurantId: input.restaurantId,
      imagePath: input.imagePath,
      altTextFr: altFr || null,
      altTextEn: altEn || null,
    });

    await this.repo.markMenuAsDraft(input.restaurantId);
  }
}
