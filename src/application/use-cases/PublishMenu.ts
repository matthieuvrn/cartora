import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { SnapshotRepository } from "@/application/ports/SnapshotRepository";
import type { Clock } from "@/application/ports/Clock";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { buildPublicSnapshot } from "@/domain/menu/PublicMenuTypes";
import { DomainError } from "@/domain/errors/DomainError";

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
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    const menu = await this.menuRepo.getMenuByRestaurantId(input.restaurantId);
    if (!menu) {
      throw new DomainError("menu_not_found", { entityId: input.restaurantId });
    }

    const availableItemCount = menu.categories.reduce(
      (sum, cat) => sum + cat.items.filter((item) => item.isAvailable).length,
      0,
    );

    const result = PlanPolicy.canPublish(
      restaurant.planTier,
      restaurant.planStatus,
      availableItemCount,
    );
    if (!result.allowed) {
      // PlanPolicy peut renvoyer `plan_free`, `billing_issue`, `no_items`. On distingue
      // `no_items` pour permettre à l'UI un message ciblé ; les deux autres motifs sont
      // tous deux "votre formule ne permet pas de publier" → `plan_inactive`.
      const code = result.reason === "no_items" ? "no_items" : "plan_inactive";
      throw new DomainError(code, { tier: restaurant.planTier });
    }

    const now = this.clock.nowISO();
    const branding = PlanPolicy.canUseBranding(restaurant.planTier)
      ? {
          primary: restaurant.brandPrimary ?? undefined,
          accent: restaurant.brandAccent ?? undefined,
          background: restaurant.brandBackground ?? undefined,
        }
      : null;
    const snapshot = buildPublicSnapshot(
      menu,
      restaurant.displayName,
      now,
      restaurant.logoPath,
      branding,
    );

    await this.snapshotRepo.upsertSnapshot({
      menuId: menu.menuId,
      restaurantId: input.restaurantId,
      slug: restaurant.slug,
      snapshotData: snapshot,
      publishedAt: now,
    });

    await this.menuRepo.updateMenuStatus({
      menuId: menu.menuId,
      status: "PUBLISHED",
      publishedAt: now,
    });

    return { slug: restaurant.slug };
  }
}
