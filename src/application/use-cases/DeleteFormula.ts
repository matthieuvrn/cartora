import type { MenuRepository } from "@/application/ports/MenuRepository";
import { DomainError } from "@/domain/errors/DomainError";

export type DeleteFormulaInput = {
  formulaId: string;
  restaurantId: string;
};

export class DeleteFormula {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: DeleteFormulaInput): Promise<void> {
    const formula = await this.repo.getFormula({
      formulaId: input.formulaId,
      restaurantId: input.restaurantId,
    });
    if (!formula) throw new DomainError("item_not_found", { entityId: input.formulaId });

    await this.repo.deleteFormula({
      formulaId: input.formulaId,
      restaurantId: input.restaurantId,
    });
    await this.repo.markMenuAsDraft(input.restaurantId);
  }
}
