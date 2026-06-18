import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { Clock } from "@/application/ports/Clock";
import { DailyDishPolicy } from "@/domain/menu/DailyDishPolicy";
import { ItemPolicy } from "@/domain/menu/ItemPolicy";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import type { MenuLocale } from "@/domain/menu/MenuLocale";
import { DomainError } from "@/domain/errors/DomainError";

export type CreateDailyDishInput = {
  restaurantId: string;
  priceCents: number;
  badge: string;
  allergens?: readonly string[];
  /** ISO 8601 UTC. Si absent, default = fin de la journée courante Europe/Paris. */
  validUntilISO?: string;
  /** Langue de saisie (S4) — le contenu est écrit UNIQUEMENT dans cette locale. */
  sourceLocale: MenuLocale;
  name: string;
  description: string;
};

export type CreateDailyDishOutput = {
  dishId: string;
};

export class CreateDailyDish {
  constructor(
    private readonly menuRepo: MenuRepository,
    private readonly restaurantRepo: RestaurantRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateDailyDishInput): Promise<CreateDailyDishOutput> {
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    if (!PlanPolicy.canUseDailyDishes(restaurant.planTier)) {
      throw new DomainError("daily_dishes_not_allowed", { tier: restaurant.planTier });
    }

    const name = DailyDishPolicy.sanitizeName(input.name);
    const description = DailyDishPolicy.sanitizeDescription(input.description);

    const nameError = DailyDishPolicy.validateName(name);
    if (nameError) throw new DomainError(nameError.code, { field: nameError.field });

    const priceError = DailyDishPolicy.validatePriceCents(input.priceCents);
    if (priceError) throw new DomainError(priceError.code, { field: priceError.field });

    const badgeError = ItemPolicy.validateBadge(input.badge);
    if (badgeError)
      throw new DomainError(badgeError.code, {
        field: badgeError.field,
        invalidValue: input.badge,
      });

    const allergens = ItemPolicy.validateAllergens(input.allergens ?? []);
    if (allergens.error)
      throw new DomainError(allergens.error.code, { field: allergens.error.field });

    const nowISO = this.clock.nowISO();
    const validUntilISO = input.validUntilISO ?? DailyDishPolicy.defaultExpirationISO(nowISO);

    const expirationError = DailyDishPolicy.validateValidUntil(validUntilISO, nowISO);
    if (expirationError)
      throw new DomainError(expirationError.code, { field: expirationError.field });

    const menuId = await this.menuRepo.getMenuIdByRestaurantId(input.restaurantId);
    if (!menuId) throw new DomainError("menu_not_found", { entityId: input.restaurantId });

    const order = await this.menuRepo.getNextDailyDishOrder(input.restaurantId);

    const { id } = await this.menuRepo.createDailyDish({
      restaurantId: input.restaurantId,
      menuId,
      priceCents: input.priceCents,
      badge: input.badge as "NONE" | "NEW" | "POPULAR",
      allergens: allergens.ok,
      validUntilISO,
      order,
      sourceLocale: input.sourceLocale,
      texts: { name, description },
    });

    await this.menuRepo.markMenuAsDraft(input.restaurantId);

    return { dishId: id };
  }
}
