import type { MenuRepository } from "@/application/ports/MenuRepository";
import { DomainError } from "@/domain/errors/DomainError";

export type SetItemAvailabilityInput = {
  restaurantId: string;
  itemId: string;
  isAvailable: boolean;
};

/**
 * Bascule la disponibilité d'un item — le « 86 » d'un plat en plein service,
 * en un tap depuis la carte (pas besoin d'ouvrir le formulaire d'édition).
 *
 * Le snapshot public EXCLUT les items indisponibles au moment du build
 * (cf. `buildPublicSnapshot`) : la bascule n'est visible des clients qu'à la
 * prochaine publication — d'où le `markMenuAsDraft`, qui réactive le CTA
 * « Publier les modifications ».
 */
export class SetItemAvailability {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: SetItemAvailabilityInput): Promise<void> {
    const item = await this.repo.getItem({
      itemId: input.itemId,
      restaurantId: input.restaurantId,
    });
    if (!item) throw new DomainError("item_not_found", { entityId: input.itemId });

    await this.repo.updateItemAvailability({
      itemId: input.itemId,
      restaurantId: input.restaurantId,
      isAvailable: input.isAvailable,
    });

    await this.repo.markMenuAsDraft(input.restaurantId);
  }
}
