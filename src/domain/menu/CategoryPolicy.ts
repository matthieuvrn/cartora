import { PlanPolicy, type PlanTier } from "@/domain/billing/PlanPolicy";
import type { ValidationFailure } from "@/domain/errors/DomainError";

/**
 * Hard cap absolu (toutes formules confondues) pour la taille de l'UI / éviter les
 * cas pathologiques type 500 catégories. Le quota par tier vient de PlanPolicy.
 */
export const MAX_CATEGORIES = 50;
export const MAX_CATEGORY_NAME_LENGTH = 50;

export class CategoryPolicy {
  static sanitizeName(value: string): string {
    const collapsed = value.trim().replace(/\s+/g, " ");
    return collapsed.length > MAX_CATEGORY_NAME_LENGTH
      ? collapsed.slice(0, MAX_CATEGORY_NAME_LENGTH)
      : collapsed;
  }

  /**
   * Valide un nom de catégorie. Renvoie `null` si OK, sinon un objet `{ field, code }`
   * que les use cases convertissent en `DomainError` et que l'UI traduit via i18n.
   */
  static validateName(value: string): ValidationFailure | null {
    if (!value) return { field: "name", code: "name_required" };
    if (value.length > MAX_CATEGORY_NAME_LENGTH) return { field: "name", code: "name_too_long" };
    // Pas de caractères de contrôle (\x00-\x1F, \x7F).
    if (/[\x00-\x1F\x7F]/.test(value)) return { field: "name", code: "name_control_chars" };
    return null;
  }

  /** Quota par tier (FREE=6, STARTER=10, PRO=Infinity), borné par MAX_CATEGORIES. */
  static maxFor(tier: PlanTier): number {
    return Math.min(PlanPolicy.maxCategoriesFor(tier), MAX_CATEGORIES);
  }

  static canAddCategory(currentCount: number, tier: PlanTier): boolean {
    return currentCount < CategoryPolicy.maxFor(tier);
  }

  /**
   * Vérifie si `candidate` est un doublon d'une des `existingNames` (insensible à la casse + trim).
   * `excludeId` permet d'ignorer la catégorie elle-même lors d'un rename.
   */
  static isDuplicateName(
    existing: readonly { id: string; name: string }[],
    candidate: string,
    excludeId?: string,
  ): boolean {
    const normalized = candidate.trim().toLowerCase();
    return existing.some((c) => c.id !== excludeId && c.name.trim().toLowerCase() === normalized);
  }
}
