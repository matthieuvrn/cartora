import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import { BrandingPolicy } from "@/domain/restaurant/BrandingPolicy";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { DomainError } from "@/domain/errors/DomainError";

export type UpdateBrandColorsInput = {
  restaurantId: string;
  /** Hex `#RRGGBB` ou `null` pour reset à la couleur par défaut du template. */
  primary: string | null;
  accent: string | null;
  background: string | null;
  /**
   * Si `true`, on bypass la vérification WCAG AA (warning persistant côté UI).
   * Sinon, throw `low_brand_contrast` quand primary ↔ background < 4.5:1.
   * Utilisé pour les cas où l'identité visuelle imposée prime sur l'a11y stricte.
   */
  forceLowContrast?: boolean;
};

/**
 * Persiste les couleurs de marque d'un restaurateur PRO. Valide :
 *   - tier === PRO (via `PlanPolicy.canUseBranding`)
 *   - chaque couleur fournie au format hex `#RRGGBB`
 *   - contraste WCAG AA entre `primary` et `background` (≥ 4.5:1)
 *     sauf si `forceLowContrast` est vrai
 *
 * Toute mutation appelle `markMenuAsDraft` pour forcer un republish — le snapshot
 * public doit refléter les nouvelles couleurs (cf. convention CLAUDE.md).
 */
export class UpdateBrandColors {
  constructor(
    private readonly restaurantRepo: RestaurantRepository,
    private readonly menuRepo: MenuRepository,
  ) {}

  async execute(input: UpdateBrandColorsInput): Promise<void> {
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    if (!PlanPolicy.canUseBranding(restaurant.planTier)) {
      throw new DomainError("branding_not_allowed", { tier: restaurant.planTier });
    }

    const primary = input.primary
      ? BrandingPolicy.normalizeHexColor(input.primary, "primary")
      : null;
    const accent = input.accent ? BrandingPolicy.normalizeHexColor(input.accent, "accent") : null;
    const background = input.background
      ? BrandingPolicy.normalizeHexColor(input.background, "background")
      : null;

    if (!input.forceLowContrast && primary && background) {
      if (!BrandingPolicy.meetsContrastAA(primary, background)) {
        throw new DomainError("low_brand_contrast", {
          field: "primary",
        });
      }
    }

    await this.restaurantRepo.updateBrandColors({
      restaurantId: input.restaurantId,
      primary,
      accent,
      background,
    });

    await this.menuRepo.markMenuAsDraft(input.restaurantId);
  }
}
