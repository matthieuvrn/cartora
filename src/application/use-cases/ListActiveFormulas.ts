import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { Clock } from "@/application/ports/Clock";
import type { FormulaData } from "@/domain/menu/MenuTypes";
import { FormulaPolicy } from "@/domain/menu/FormulaPolicy";

export type ListActiveFormulasInput = {
  restaurantId: string;
};

export type ListActiveFormulasOutput = {
  active: FormulaData[];
  expired: FormulaData[];
};

/**
 * Lecture dashboard. Sépare les formules actives (visibles côté public) des expirées
 * (encore listées côté restaurateur pour suppression manuelle, exclues du rendu public).
 */
export class ListActiveFormulas {
  constructor(
    private readonly repo: MenuRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: ListActiveFormulasInput): Promise<ListActiveFormulasOutput> {
    const all = await this.repo.listFormulas(input.restaurantId);
    const nowISO = this.clock.nowISO();

    const active: FormulaData[] = [];
    const expired: FormulaData[] = [];
    for (const entry of all) {
      if (FormulaPolicy.isActive(entry, nowISO)) {
        active.push(entry);
      } else {
        expired.push(entry);
      }
    }

    return { active, expired };
  }
}
