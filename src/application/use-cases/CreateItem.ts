import type { MenuRepository } from "@/application/ports/MenuRepository";
import { ItemPolicy } from "@/domain/menu/ItemPolicy";

export type CreateItemInput = {
  categoryId: string;
  restaurantId: string;
  priceCents: number;
  badge: string;
  allergens?: readonly string[];
  translations: {
    fr: { name: string; description: string };
    en?: { name?: string; description?: string };
  };
};

export type CreateItemOutput = {
  itemId: string;
};

export class CreateItem {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: CreateItemInput): Promise<CreateItemOutput> {
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

    const allergens = ItemPolicy.validateAllergens(input.allergens ?? []);
    if (allergens.error) throw new Error(allergens.error);

    const isOwned = await this.repo.verifyCategoryOwnership(input.categoryId, input.restaurantId);
    if (!isOwned) throw new Error("Cette catégorie n'appartient pas à ce restaurant");

    const order = await this.repo.getNextItemOrder(input.categoryId);

    const { id } = await this.repo.createItem({
      categoryId: input.categoryId,
      restaurantId: input.restaurantId,
      priceCents: input.priceCents,
      badge: input.badge as "NONE" | "NEW" | "POPULAR",
      allergens: allergens.ok,
      isAvailable: true,
      order,
      translations: {
        fr: { name: frName, description: frDesc },
        en: { name: enName, description: enDesc },
      },
    });

    return { itemId: id };
  }
}
