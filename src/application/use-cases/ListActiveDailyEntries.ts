import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { Clock } from "@/application/ports/Clock";
import type { DailyMenuEntryData } from "@/domain/menu/MenuTypes";
import { DailyMenuPolicy } from "@/domain/menu/DailyMenuPolicy";

export type ListActiveDailyEntriesInput = {
  restaurantId: string;
};

export type ListActiveDailyEntriesOutput = {
  active: DailyMenuEntryData[];
  expired: DailyMenuEntryData[];
};

/**
 * Lecture dashboard. Sépare les daily entries actives (visibles côté public) des
 * expirées (que le restaurateur peut encore voir/supprimer manuellement, mais qui
 * ne sont plus rendues sur `/m/[slug]`).
 */
export class ListActiveDailyEntries {
  constructor(
    private readonly repo: MenuRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: ListActiveDailyEntriesInput): Promise<ListActiveDailyEntriesOutput> {
    const all = await this.repo.listDailyEntries(input.restaurantId);
    const nowISO = this.clock.nowISO();

    const active: DailyMenuEntryData[] = [];
    const expired: DailyMenuEntryData[] = [];
    for (const entry of all) {
      if (DailyMenuPolicy.isActive(entry, nowISO)) {
        active.push(entry);
      } else {
        expired.push(entry);
      }
    }

    return { active, expired };
  }
}
