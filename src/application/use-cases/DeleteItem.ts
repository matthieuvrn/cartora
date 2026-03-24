import type { MenuRepository } from "@/application/ports/MenuRepository";

export type DeleteItemInput = {
  itemId: string;
  restaurantId: string;
};

export class DeleteItem {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: DeleteItemInput): Promise<void> {
    await this.repo.deleteItem(input.itemId, input.restaurantId);
  }
}
