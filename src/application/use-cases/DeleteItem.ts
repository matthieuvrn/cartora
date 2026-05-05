import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { StorageService } from "@/application/ports/StorageService";

export type DeleteItemInput = {
  itemId: string;
  restaurantId: string;
};

export class DeleteItem {
  constructor(
    private readonly repo: MenuRepository,
    private readonly itemImageStorage: StorageService,
  ) {}

  async execute(input: DeleteItemInput): Promise<void> {
    const item = await this.repo.getItem({
      itemId: input.itemId,
      restaurantId: input.restaurantId,
    });

    if (item?.imagePath) {
      try {
        await this.itemImageStorage.delete(item.imagePath);
      } catch {
        // Non-fatal: we still drop the DB row to honor the user's deletion intent.
      }
    }

    await this.repo.deleteItem({ itemId: input.itemId, restaurantId: input.restaurantId });
  }
}
