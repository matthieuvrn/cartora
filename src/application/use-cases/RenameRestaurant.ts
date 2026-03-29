import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import { RestaurantPolicy } from "@/domain/restaurant/RestaurantPolicy";

export type RenameRestaurantInput = {
  restaurantId: string;
  displayName: string;
};

export class RenameRestaurant {
  constructor(private readonly repo: RestaurantRepository) {}

  async execute(input: RenameRestaurantInput): Promise<void> {
    const displayName = RestaurantPolicy.sanitizeDisplayName(input.displayName);

    const nameError = RestaurantPolicy.validateDisplayName(displayName);
    if (nameError) throw new Error(nameError);

    await this.repo.updateDisplayName({
      restaurantId: input.restaurantId,
      displayName,
    });
  }
}
