import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { Clock } from "@/application/ports/Clock";
import { FormulaPolicy } from "@/domain/menu/FormulaPolicy";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import type { MenuLocale } from "@/domain/menu/MenuLocale";
import { DomainError } from "@/domain/errors/DomainError";

export type UpdateFormulaInput = {
  formulaId: string;
  restaurantId: string;
  priceCents: number;
  validUntilISO: string;
  /** Langue de saisie (S4) — les traductions cibles ne sont jamais touchées ici. */
  sourceLocale: MenuLocale;
  name: string;
  description: string;
};

export class UpdateFormula {
  constructor(
    private readonly menuRepo: MenuRepository,
    private readonly restaurantRepo: RestaurantRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateFormulaInput): Promise<void> {
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    if (!PlanPolicy.canUseFormulas(restaurant.planTier)) {
      throw new DomainError("formula_not_allowed", { tier: restaurant.planTier });
    }

    const existing = await this.menuRepo.getFormula({
      formulaId: input.formulaId,
      restaurantId: input.restaurantId,
    });
    if (!existing) throw new DomainError("item_not_found", { entityId: input.formulaId });

    const name = FormulaPolicy.sanitizeName(input.name);
    const description = FormulaPolicy.sanitizeDescription(input.description);

    const nameError = FormulaPolicy.validateName(name);
    if (nameError) throw new DomainError(nameError.code, { field: nameError.field });

    const descError = FormulaPolicy.validateDescription(description);
    if (descError) throw new DomainError(descError.code, { field: descError.field });

    const priceError = FormulaPolicy.validatePriceCents(input.priceCents);
    if (priceError) throw new DomainError(priceError.code, { field: priceError.field });

    const expirationError = FormulaPolicy.validateValidUntil(
      input.validUntilISO,
      this.clock.nowISO(),
    );
    if (expirationError)
      throw new DomainError(expirationError.code, { field: expirationError.field });

    await this.menuRepo.updateFormula({
      formulaId: input.formulaId,
      restaurantId: input.restaurantId,
      priceCents: input.priceCents,
      validUntilISO: input.validUntilISO,
      sourceLocale: input.sourceLocale,
      texts: { name, description },
    });

    await this.menuRepo.markMenuAsDraft(input.restaurantId);
  }
}
