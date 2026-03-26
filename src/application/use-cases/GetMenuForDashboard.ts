import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { MenuOverview } from "@/domain/menu/MenuTypes";

export type GetMenuForDashboardInput = {
  restaurantId: string;
};

export type GetMenuForDashboardOutput = MenuOverview;

export class GetMenuForDashboard {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: GetMenuForDashboardInput): Promise<GetMenuForDashboardOutput> {
    const menu = await this.repo.getMenuByRestaurantId(input.restaurantId);

    if (!menu) {
      throw new Error(`Menu introuvable pour le restaurant ${input.restaurantId}`);
    }

    return menu;
  }
}
