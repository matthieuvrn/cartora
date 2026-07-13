import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { MenuLocalePolicy } from "@/domain/menu/MenuLocalePolicy";
import type { MenuLocale } from "@/domain/menu/MenuLocale";
import { DomainError } from "@/domain/errors/DomainError";

export type UpdateMenuLocalesInput = {
  restaurantId: string;
  /** Codes bruts venus de l'UI — normalisés/validés par `MenuLocalePolicy`. */
  locales: string[];
};

export type UpdateMenuLocalesOutput = {
  menuLocales: MenuLocale[];
};

/**
 * Remplace la liste des langues cibles activées du menu (S4 — multilingue).
 *
 * Règles métier : quota par tier via `PlanPolicy.maxExtraMenuLocalesFor`
 * (FREE=0, STARTER=0, PRO=∞) ; la langue source est toujours disponible et
 * jamais comptée. Désactiver une langue ne supprime PAS ses traductions —
 * elles restent en base et réapparaissent si la langue est réactivée.
 * L'effet public suit le pattern projet : `markMenuAsDraft` côté action,
 * puis republication explicite.
 */
export class UpdateMenuLocales {
  constructor(private readonly restaurantRepo: RestaurantRepository) {}

  async execute(input: UpdateMenuLocalesInput): Promise<UpdateMenuLocalesOutput> {
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    const normalized = MenuLocalePolicy.normalizeEnabledLocales(
      restaurant.sourceLocale,
      input.locales,
    );
    const maxExtra = PlanPolicy.maxExtraMenuLocalesFor(restaurant.planTier);
    const failure = MenuLocalePolicy.validateEnabledLocales({
      sourceLocale: restaurant.sourceLocale,
      normalized,
      maxExtra,
    });

    if (failure?.code === "invalid_locale") {
      const invalid = normalized.find((c) => MenuLocalePolicy.validateLocaleCode(c) !== null);
      throw new DomainError("invalid_locale", { field: failure.field, locale: invalid });
    }
    if (failure?.code === "locale_quota_exceeded") {
      throw new DomainError("locale_quota_exceeded", {
        limit: maxExtra,
        current: normalized.length,
        tier: restaurant.planTier,
      });
    }

    // `validateEnabledLocales` a vérifié chaque code — l'affirmation est sûre.
    const menuLocales = normalized as MenuLocale[];
    await this.restaurantRepo.updateMenuLocales({
      restaurantId: input.restaurantId,
      menuLocales,
    });

    return { menuLocales };
  }
}
