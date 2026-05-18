import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { StorageService } from "@/application/ports/StorageService";
import { DomainError } from "@/domain/errors/DomainError";

export type DeleteDailyEntryImageInput = {
  restaurantId: string;
  entryId: string;
};

export class DeleteDailyEntryImage {
  constructor(
    private readonly repo: MenuRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(input: DeleteDailyEntryImageInput): Promise<void> {
    const entry = await this.repo.getDailyEntry({
      entryId: input.entryId,
      restaurantId: input.restaurantId,
    });
    if (!entry) throw new DomainError("item_not_found", { entityId: input.entryId });

    if (entry.imagePath) {
      try {
        await this.storage.delete(entry.imagePath);
      } catch {
        // Non-fatal — la DB est mise à jour pour stopper l'affichage d'une image cassée.
      }
    }

    await this.repo.updateDailyEntryImage({
      entryId: input.entryId,
      restaurantId: input.restaurantId,
      imagePath: null,
      altTextFr: null,
      altTextEn: null,
    });

    await this.repo.markMenuAsDraft(input.restaurantId);
  }
}
