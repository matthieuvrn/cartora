export const MAX_ITEM_NAME_LENGTH = 100;
export const MAX_ITEM_DESCRIPTION_LENGTH = 500;
export const MIN_PRICE_CENTS = 0;
export const MAX_PRICE_CENTS = 99999;

export type ItemBadge = "NONE" | "NEW" | "POPULAR";

const VALID_BADGES: readonly string[] = ["NONE", "NEW", "POPULAR"];

export class ItemPolicy {
  static validateName(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return "Le nom est obligatoire";
    if (trimmed.length > MAX_ITEM_NAME_LENGTH)
      return `Le nom ne doit pas dépasser ${MAX_ITEM_NAME_LENGTH} caractères`;
    return null;
  }

  static validateDescription(value: string): string | null {
    if (value.trim().length > MAX_ITEM_DESCRIPTION_LENGTH)
      return `La description ne doit pas dépasser ${MAX_ITEM_DESCRIPTION_LENGTH} caractères`;
    return null;
  }

  static validatePriceCents(value: number): string | null {
    if (!Number.isInteger(value)) return "Le prix doit être un nombre entier";
    if (value < MIN_PRICE_CENTS) return `Le prix doit être >= ${MIN_PRICE_CENTS}`;
    if (value > MAX_PRICE_CENTS) return `Le prix doit être <= ${MAX_PRICE_CENTS}`;
    return null;
  }

  static validateBadge(value: string): string | null {
    if (!VALID_BADGES.includes(value)) return `Badge invalide : ${value}`;
    return null;
  }

  static sanitizeName(value: string): string {
    const trimmed = value.trim();
    return trimmed.length > MAX_ITEM_NAME_LENGTH ? trimmed.slice(0, MAX_ITEM_NAME_LENGTH) : trimmed;
  }

  static sanitizeDescription(value: string): string {
    const trimmed = value.trim();
    return trimmed.length > MAX_ITEM_DESCRIPTION_LENGTH
      ? trimmed.slice(0, MAX_ITEM_DESCRIPTION_LENGTH)
      : trimmed;
  }
}
