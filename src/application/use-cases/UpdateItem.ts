import type { MenuRepository } from "@/application/ports/MenuRepository";
import { ItemPolicy } from "@/domain/menu/ItemPolicy";

export type UpdateItemInput = {
  itemId: string;
  restaurantId: string;
  priceCents: number;
  badge: string;
  isAvailable: boolean;
  translations: {
    fr: { name: string; description: string };
    en?: { name?: string; description?: string };
  };
};

export class UpdateItem {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: UpdateItemInput): Promise<void> {
    const frName = ItemPolicy.sanitizeName(input.translations.fr.name);
    const frDesc = ItemPolicy.sanitizeDescription(input.translations.fr.description);
    const enName = ItemPolicy.sanitizeName(input.translations.en?.name ?? "");
    const enDesc = ItemPolicy.sanitizeDescription(input.translations.en?.description ?? "");

    const nameError = ItemPolicy.validateName(frName);
    if (nameError) throw new Error(nameError);

    const priceError = ItemPolicy.validatePriceCents(input.priceCents);
    if (priceError) throw new Error(priceError);

    const badgeError = ItemPolicy.validateBadge(input.badge);
    if (badgeError) throw new Error(badgeError);

    await this.repo.updateItem({
      itemId: input.itemId,
      restaurantId: input.restaurantId,
      priceCents: input.priceCents,
      badge: input.badge as "NONE" | "NEW" | "POPULAR",
      isAvailable: input.isAvailable,
      translations: {
        fr: { name: frName, description: frDesc },
        en: { name: enName, description: enDesc },
      },
    });
  }
}
