import type { MenuRepository } from "@/application/ports/MenuRepository";

export type DeleteItemInput = {
  itemId: string;
  restaurantId: string;
};

export class DeleteItem {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: DeleteItemInput): Promise<void> {
    await this.repo.deleteItem({ itemId: input.itemId, restaurantId: input.restaurantId });

    // Toute mutation de la carte diverge du snapshot publié → repasse en DRAFT jusqu'à
    // republication (invariant porté par le use case, cf. markMenuAsDraft).
    await this.repo.markMenuAsDraft(input.restaurantId);
  }
}
