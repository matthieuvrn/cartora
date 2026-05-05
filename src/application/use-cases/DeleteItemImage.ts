import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { StorageService } from "@/application/ports/StorageService";

export type DeleteItemImageInput = {
  restaurantId: string;
  itemId: string;
};

export class DeleteItemImage {
  constructor(
    private readonly repo: MenuRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(input: DeleteItemImageInput): Promise<void> {
    const item = await this.repo.getItem({
      itemId: input.itemId,
      restaurantId: input.restaurantId,
    });
    if (!item) throw new Error("Item introuvable");

    if (item.imagePath) {
      try {
        await this.storage.delete(item.imagePath);
      } catch {
        // Non-fatal: we still wipe the DB pointer so the UI stops showing a broken image.
      }
    }

    await this.repo.updateItemImage({
      itemId: input.itemId,
      restaurantId: input.restaurantId,
      imagePath: null,
      altTextFr: null,
      altTextEn: null,
    });

    await this.repo.markMenuAsDraft(input.restaurantId);
  }
}
