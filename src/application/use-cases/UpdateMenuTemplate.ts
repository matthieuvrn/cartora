import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import type { MenuTemplate } from "@/domain/menu/MenuTypes";
import { DomainError } from "@/domain/errors/DomainError";

export type UpdateMenuTemplateInput = {
  restaurantId: string;
  template: MenuTemplate;
};

/**
 * Bascule le template de rendu public du menu (set 2026 : CLASSIC + CARTORA + 7 premium).
 *
 * Règle métier : les templates premium (tout sauf CLASSIC) sont gatés PRO via `PlanPolicy.canUseTemplate`.
 * Le snapshot existant n'est pas régénéré ici — l'effet visible côté `/m/[slug]` suit le
 * pattern projet : `markMenuAsDraft` côté action puis republication explicite par l'utilisateur.
 */
export class UpdateMenuTemplate {
  constructor(
    private readonly menuRepo: MenuRepository,
    private readonly restaurantRepo: RestaurantRepository,
  ) {}

  async execute(input: UpdateMenuTemplateInput): Promise<void> {
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    if (!PlanPolicy.canUseTemplate(restaurant.planTier, input.template)) {
      throw new DomainError("template_not_allowed", {
        template: input.template,
        tier: restaurant.planTier,
      });
    }

    await this.menuRepo.updateTemplate({
      restaurantId: input.restaurantId,
      template: input.template,
    });
  }
}
