import type { ValidationFailure } from "@/domain/errors/DomainError";

export const MAX_ITEM_NAME_LENGTH = 100;
export const MAX_ITEM_DESCRIPTION_LENGTH = 500;
export const MIN_PRICE_CENTS = 0;
export const MAX_PRICE_CENTS = 99999;

export type ItemBadge = "NONE" | "NEW" | "POPULAR";

const VALID_BADGES: readonly string[] = ["NONE", "NEW", "POPULAR"];

// Règlement (UE) 1169/2011, annexe II — 14 allergènes à déclaration obligatoire.
export const ALLERGEN_VALUES = [
  "GLUTEN",
  "CRUSTACEANS",
  "EGGS",
  "FISH",
  "PEANUTS",
  "SOYBEANS",
  "MILK",
  "NUTS",
  "CELERY",
  "MUSTARD",
  "SESAME",
  "SULPHITES",
  "LUPIN",
  "MOLLUSCS",
] as const;

export type Allergen = (typeof ALLERGEN_VALUES)[number];

const ALLERGEN_SET: ReadonlySet<string> = new Set(ALLERGEN_VALUES);

export class ItemPolicy {
  static validateName(value: string): ValidationFailure | null {
    const trimmed = value.trim();
    if (!trimmed) return { field: "name", code: "name_required" };
    if (trimmed.length > MAX_ITEM_NAME_LENGTH) return { field: "name", code: "name_too_long" };
    return null;
  }

  static validateDescription(value: string): ValidationFailure | null {
    if (value.trim().length > MAX_ITEM_DESCRIPTION_LENGTH)
      return { field: "description", code: "description_too_long" };
    return null;
  }

  static validatePriceCents(value: number): ValidationFailure | null {
    if (!Number.isInteger(value)) return { field: "priceCents", code: "price_not_integer" };
    if (value < MIN_PRICE_CENTS) return { field: "priceCents", code: "price_too_low" };
    if (value > MAX_PRICE_CENTS) return { field: "priceCents", code: "price_too_high" };
    return null;
  }

  static validateBadge(value: string): ValidationFailure | null {
    if (!VALID_BADGES.includes(value)) return { field: "badge", code: "invalid_badge" };
    return null;
  }

  /**
   * Valide une liste d'allergènes :
   *  - chaque valeur ∈ ALLERGEN_VALUES (sinon erreur),
   *  - dédoublonnage silencieux,
   *  - taille bornée par le nombre d'allergènes officiels.
   */
  static validateAllergens(values: readonly string[]): {
    ok: Allergen[];
    error: ValidationFailure | null;
  } {
    if (values.length > ALLERGEN_VALUES.length) {
      return { ok: [], error: { field: "allergens", code: "too_many_allergens" } };
    }
    const seen = new Set<Allergen>();
    for (const v of values) {
      if (!ALLERGEN_SET.has(v))
        return { ok: [], error: { field: "allergens", code: "invalid_allergen" } };
      seen.add(v as Allergen);
    }
    return { ok: Array.from(seen), error: null };
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
