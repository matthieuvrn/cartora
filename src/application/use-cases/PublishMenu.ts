import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { SnapshotRepository } from "@/application/ports/SnapshotRepository";
import type { Clock } from "@/application/ports/Clock";
import { PublicationPolicy } from "@/domain/menu/PublicationPolicy";
import { buildPublicSnapshot } from "@/domain/menu/PublicMenuTypes";

export type PublishMenuInput = {
  restaurantId: string;
};

export type PublishMenuOutput = {
  slug: string;
};

export class PublishMenu {
  constructor(
    private readonly menuRepo: MenuRepository,
    private readonly restaurantRepo: RestaurantRepository,
    private readonly snapshotRepo: SnapshotRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: PublishMenuInput): Promise<PublishMenuOutput> {
    const restaurant = await this.restaurantRepo.getRestaurantById(
      input.restaurantId,
    );
    if (!restaurant) {
      throw new Error("Restaurant introuvable");
    }

    const menu = await this.menuRepo.getMenuByRestaurantId(input.restaurantId);
    if (!menu) {
      throw new Error("Menu introuvable");
    }

    const availableItemCount = menu.categories.reduce(
      (sum, cat) => sum + cat.items.filter((item) => item.isAvailable).length,
      0,
    );

    const result = PublicationPolicy.canPublish(
      restaurant.planStatus,
      availableItemCount,
    );
    if (!result.allowed) {
      throw new Error(result.reason);
    }

    const now = this.clock.nowISO();
    const snapshot = buildPublicSnapshot(menu, restaurant.displayName, now);

    await this.snapshotRepo.upsertSnapshot({
      menuId: menu.menuId,
      restaurantId: input.restaurantId,
      slug: restaurant.slug,
      snapshotData: snapshot,
      publishedAt: now,
    });

    await this.menuRepo.updateMenuStatus(menu.menuId, "PUBLISHED", now);

    return { slug: restaurant.slug };
  }
}
