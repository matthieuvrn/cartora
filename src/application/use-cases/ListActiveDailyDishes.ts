import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { Clock } from "@/application/ports/Clock";
import type { DailyDishData } from "@/domain/menu/MenuTypes";
import { DailyDishPolicy } from "@/domain/menu/DailyDishPolicy";

export type ListActiveDailyDishesInput = {
  restaurantId: string;
};

export type ListActiveDailyDishesOutput = {
  active: DailyDishData[];
  expired: DailyDishData[];
};

/**
 * Lecture dashboard. Sépare les daily entries actives (visibles côté public) des
 * expirées (que le restaurateur peut encore voir/supprimer manuellement, mais qui
 * ne sont plus rendues sur `/m/[slug]`).
 */
export class ListActiveDailyDishes {
  constructor(
    private readonly repo: MenuRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: ListActiveDailyDishesInput): Promise<ListActiveDailyDishesOutput> {
    const all = await this.repo.listDailyDishes(input.restaurantId);
    const nowISO = this.clock.nowISO();

    const active: DailyDishData[] = [];
    const expired: DailyDishData[] = [];
    for (const dish of all) {
      if (DailyDishPolicy.isActive(dish, nowISO)) {
        active.push(dish);
      } else {
        expired.push(dish);
      }
    }

    return { active, expired };
  }
}
