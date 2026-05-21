import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { Clock } from "@/application/ports/Clock";
import { FormulaPolicy } from "@/domain/menu/FormulaPolicy";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { DomainError } from "@/domain/errors/DomainError";

export type CreateFormulaInput = {
  restaurantId: string;
  priceCents: number;
  /** ISO 8601 UTC. Si absent, default = fin de la journée courante Europe/Paris. */
  validUntilISO?: string;
  translations: {
    fr: { name: string; description: string };
    en?: { name?: string; description?: string };
  };
};

export type CreateFormulaOutput = {
  formulaId: string;
};

export class CreateFormula {
  constructor(
    private readonly menuRepo: MenuRepository,
    private readonly restaurantRepo: RestaurantRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateFormulaInput): Promise<CreateFormulaOutput> {
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    if (!PlanPolicy.canUseFormulas(restaurant.planTier)) {
      throw new DomainError("formula_not_allowed", { tier: restaurant.planTier });
    }

    const frName = FormulaPolicy.sanitizeName(input.translations.fr.name);
    const frDesc = FormulaPolicy.sanitizeDescription(input.translations.fr.description);
    const enName = FormulaPolicy.sanitizeName(input.translations.en?.name ?? "");
    const enDesc = FormulaPolicy.sanitizeDescription(input.translations.en?.description ?? "");

    const nameError = FormulaPolicy.validateName(frName);
    if (nameError) throw new DomainError(nameError.code, { field: nameError.field });

    const descError = FormulaPolicy.validateDescription(frDesc);
    if (descError) throw new DomainError(descError.code, { field: descError.field });

    const priceError = FormulaPolicy.validatePriceCents(input.priceCents);
    if (priceError) throw new DomainError(priceError.code, { field: priceError.field });

    const nowISO = this.clock.nowISO();
    const validUntilISO = input.validUntilISO ?? FormulaPolicy.defaultExpirationISO(nowISO);

    const expirationError = FormulaPolicy.validateValidUntil(validUntilISO, nowISO);
    if (expirationError)
      throw new DomainError(expirationError.code, { field: expirationError.field });

    const menuId = await this.menuRepo.getMenuIdByRestaurantId(input.restaurantId);
    if (!menuId) throw new DomainError("menu_not_found", { entityId: input.restaurantId });

    const order = await this.menuRepo.getNextFormulaOrder(input.restaurantId);

    const { id } = await this.menuRepo.createFormula({
      restaurantId: input.restaurantId,
      menuId,
      priceCents: input.priceCents,
      validUntilISO,
      order,
      translations: {
        fr: { name: frName, description: frDesc },
        en: { name: enName, description: enDesc },
      },
    });

    await this.menuRepo.markMenuAsDraft(input.restaurantId);

    return { formulaId: id };
  }
}
