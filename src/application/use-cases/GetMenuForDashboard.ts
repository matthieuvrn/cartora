import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { MenuOverview } from "@/domain/menu/MenuTypes";
import { DomainError } from "@/domain/errors/DomainError";

export type GetMenuForDashboardInput = {
  restaurantId: string;
};

export type GetMenuForDashboardOutput = MenuOverview;

export class GetMenuForDashboard {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: GetMenuForDashboardInput): Promise<GetMenuForDashboardOutput> {
    const menu = await this.repo.getMenuByRestaurantId(input.restaurantId);

    if (!menu) {
      // L'appelant (server component dashboard) catch ce code et appelle `notFound()`
      // pour rendre `not-found.tsx` au lieu de `error.tsx`.
      throw new DomainError("menu_not_found", { entityId: input.restaurantId });
    }

    return menu;
  }
}
