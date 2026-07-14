import type { MenuRepository } from "@/application/ports/MenuRepository";
import type { MenuLocale } from "@/domain/menu/MenuLocale";
import { ItemPolicy } from "@/domain/menu/ItemPolicy";
import { DomainError } from "@/domain/errors/DomainError";

export type CreateItemInput = {
  categoryId: string;
  restaurantId: string;
  priceCents: number;
  badge: string;
  allergens?: readonly string[];
  /** Langue de saisie (S4) — le contenu est écrit UNIQUEMENT dans cette locale. */
  sourceLocale: MenuLocale;
  name: string;
  description: string;
};

export type CreateItemOutput = {
  itemId: string;
};

export class CreateItem {
  constructor(private readonly repo: MenuRepository) {}

  async execute(input: CreateItemInput): Promise<CreateItemOutput> {
    const name = ItemPolicy.sanitizeName(input.name);
    const description = ItemPolicy.sanitizeDescription(input.description);

    const nameError = ItemPolicy.validateName(name);
    if (nameError) throw new DomainError(nameError.code, { field: nameError.field });

    const priceError = ItemPolicy.validatePriceCents(input.priceCents);
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

    const isOwned = await this.repo.verifyCategoryOwnership(input.categoryId, input.restaurantId);
    if (!isOwned) throw new DomainError("ownership_mismatch", { entityId: input.categoryId });

    const order = await this.repo.getNextItemOrder(input.categoryId);

    const { id } = await this.repo.createItem({
      categoryId: input.categoryId,
      restaurantId: input.restaurantId,
      priceCents: input.priceCents,
      badge: input.badge as "NONE" | "NEW" | "POPULAR",
      allergens: allergens.ok,
      isAvailable: true,
      order,
      sourceLocale: input.sourceLocale,
      texts: { name, description },
    });

    // Toute mutation de la carte diverge du snapshot publié → repasse en DRAFT jusqu'à
    // republication (invariant porté par le use case, cf. markMenuAsDraft).
    await this.repo.markMenuAsDraft(input.restaurantId);

    return { itemId: id };
  }
}
