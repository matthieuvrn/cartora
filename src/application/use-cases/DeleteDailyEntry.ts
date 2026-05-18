import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { StorageService } from "@/application/ports/StorageService";
import { DomainError } from "@/domain/errors/DomainError";

export type DeleteDailyEntryInput = {
  entryId: string;
  restaurantId: string;
};

export class DeleteDailyEntry {
  constructor(
    private readonly repo: MenuRepository,
    private readonly itemImageStorage: StorageService,
  ) {}

  async execute(input: DeleteDailyEntryInput): Promise<void> {
    const entry = await this.repo.getDailyEntry({
      entryId: input.entryId,
      restaurantId: input.restaurantId,
    });
    if (!entry) throw new DomainError("item_not_found", { entityId: input.entryId });

    if (entry.imagePath) {
      try {
        await this.itemImageStorage.delete(entry.imagePath);
      } catch {
        // Non-fatal : on supprime quand même la ligne pour honorer l'intention utilisateur.
      }
    }

    await this.repo.deleteDailyEntry({ entryId: input.entryId, restaurantId: input.restaurantId });
    await this.repo.markMenuAsDraft(input.restaurantId);
  }
}
