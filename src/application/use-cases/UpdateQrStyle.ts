import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import { QrStylePolicy } from "@/domain/restaurant/QrStylePolicy";
import { DomainError } from "@/domain/errors/DomainError";

export type UpdateQrStyleInput = {
  restaurantId: string;
  darkColor: string;
  lightColor: string;
  dotsStyle: string;
  cornersStyle: string;
};

/**
 * Persiste la personnalisation du QR code (couleurs + formes) d'un restaurateur.
 *
 * Découplé du template et des couleurs de marque (décision produit 2026). Le style est
 * validé par `QrStylePolicy` (contraste, code non inversé, styles bornés).
 *
 * Ouvert à tous les forfaits — le QR n'existe de toute façon qu'après publication (STARTER+).
 *
 * ⚠️ N'appelle PAS `markMenuAsDraft` : le QrStyle n'entre jamais dans le snapshot public
 * (c'est de la décoration pour l'image téléchargée), comme `RenameRestaurant` /
 * `UpdateMenuLocales` qui opèrent sur le seul agrégat Restaurant. Aucun `MenuRepository`.
 */
export class UpdateQrStyle {
  constructor(private readonly restaurantRepo: RestaurantRepository) {}

  async execute(input: UpdateQrStyleInput): Promise<void> {
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    const style = QrStylePolicy.normalize({
      darkColor: input.darkColor,
      lightColor: input.lightColor,
      dotsStyle: input.dotsStyle,
      cornersStyle: input.cornersStyle,
    });

    await this.restaurantRepo.updateQrStyle({ restaurantId: input.restaurantId, style });
  }
}
