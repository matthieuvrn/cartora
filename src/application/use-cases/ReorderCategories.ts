import type { MenuRepository } from "@/application/ports/MenuRepository";

export type ReorderCategoriesInput = {
  restaurantId: string;
  menuId: string;
  orderedIds: string[];
};

export class ReorderCategories {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: ReorderCategoriesInput): Promise<void> {
    if (input.orderedIds.length === 0) {
      throw new Error("La liste des catégories ne peut pas être vide");
    }

    const isOwned = await this.repo.verifyMenuOwnership(input.menuId, input.restaurantId);
    if (!isOwned) throw new Error("Ce menu n'appartient pas à ce restaurant");

    const existing = await this.repo.listCategoryNames(input.menuId);
    const existingIds = new Set(existing.map((c) => c.id));
    const requestedIds = new Set(input.orderedIds);

    if (
      existingIds.size !== requestedIds.size ||
      [...existingIds].some((id) => !requestedIds.has(id))
    ) {
      throw new Error("La liste doit contenir exactement les catégories existantes");
    }

    await this.repo.reorderCategories({
      menuId: input.menuId,
      restaurantId: input.restaurantId,
      orderedIds: input.orderedIds,
    });
  }
}
