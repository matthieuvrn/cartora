import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { Clock } from "@/application/ports/Clock";
import { DailyMenuPolicy } from "@/domain/menu/DailyMenuPolicy";
import { ItemPolicy } from "@/domain/menu/ItemPolicy";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { DomainError } from "@/domain/errors/DomainError";

export type UpdateDailyEntryInput = {
  entryId: string;
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

export class UpdateDailyEntry {
  constructor(
    private readonly menuRepo: MenuRepository,
    private readonly restaurantRepo: RestaurantRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateDailyEntryInput): Promise<void> {
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    if (!PlanPolicy.canUseDailyMenu(restaurant.planTier)) {
      throw new DomainError("daily_menu_not_allowed", { tier: restaurant.planTier });
    }

    const existing = await this.menuRepo.getDailyEntry({
      entryId: input.entryId,
      restaurantId: input.restaurantId,
    });
    if (!existing) throw new DomainError("item_not_found", { entityId: input.entryId });

    const frName = DailyMenuPolicy.sanitizeName(input.translations.fr.name);
    const frDesc = DailyMenuPolicy.sanitizeDescription(input.translations.fr.description);
    const enName = DailyMenuPolicy.sanitizeName(input.translations.en?.name ?? "");
    const enDesc = DailyMenuPolicy.sanitizeDescription(input.translations.en?.description ?? "");

    const nameError = DailyMenuPolicy.validateName(frName);
    if (nameError) throw new DomainError(nameError.code, { field: nameError.field });

    const priceError = DailyMenuPolicy.validatePriceCents(input.priceCents);
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

    const expirationError = DailyMenuPolicy.validateValidUntil(
      input.validUntilISO,
      this.clock.nowISO(),
    );
    if (expirationError)
      throw new DomainError(expirationError.code, { field: expirationError.field });

    await this.menuRepo.updateDailyEntry({
      entryId: input.entryId,
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
