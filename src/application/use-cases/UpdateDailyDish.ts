import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { Clock } from "@/application/ports/Clock";
import { DailyDishPolicy } from "@/domain/menu/DailyDishPolicy";
import { ItemPolicy } from "@/domain/menu/ItemPolicy";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { DomainError } from "@/domain/errors/DomainError";

export type UpdateDailyDishInput = {
  dishId: string;
  restaurantId: string;
  priceCents: number;
  badge: string;
  allergens?: readonly string[];
  validUntilISO: string;
  translations: {
    fr: { name: string; description: string };
    en?: { name?: string; description?: string };
  };
};

export class UpdateDailyDish {
  constructor(
    private readonly menuRepo: MenuRepository,
    private readonly restaurantRepo: RestaurantRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateDailyDishInput): Promise<void> {
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    if (!PlanPolicy.canUseDailyDishes(restaurant.planTier)) {
      throw new DomainError("daily_dishes_not_allowed", { tier: restaurant.planTier });
    }

    const existing = await this.menuRepo.getDailyDish({
      dishId: input.dishId,
      restaurantId: input.restaurantId,
    });
    if (!existing) throw new DomainError("item_not_found", { entityId: input.dishId });

    const frName = DailyDishPolicy.sanitizeName(input.translations.fr.name);
    const frDesc = DailyDishPolicy.sanitizeDescription(input.translations.fr.description);
    const enName = DailyDishPolicy.sanitizeName(input.translations.en?.name ?? "");
    const enDesc = DailyDishPolicy.sanitizeDescription(input.translations.en?.description ?? "");

    const nameError = DailyDishPolicy.validateName(frName);
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

    const expirationError = DailyDishPolicy.validateValidUntil(
      input.validUntilISO,
      this.clock.nowISO(),
    );
    if (expirationError)
      throw new DomainError(expirationError.code, { field: expirationError.field });

    await this.menuRepo.updateDailyDish({
      dishId: input.dishId,
      restaurantId: input.restaurantId,
      priceCents: input.priceCents,
      badge: input.badge as "NONE" | "NEW" | "POPULAR",
      allergens: allergens.ok,
      validUntilISO: input.validUntilISO,
      translations: {
        fr: { name: frName, description: frDesc },
        en: { name: enName, description: enDesc },
      },
    });

    await this.menuRepo.markMenuAsDraft(input.restaurantId);
  }
}
