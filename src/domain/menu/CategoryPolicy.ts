import { PlanPolicy, type PlanTier } from "@/domain/billing/PlanPolicy";

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

  static validateName(value: string): string | null {
    if (!value) return "Le nom est obligatoire";
    if (value.length > MAX_CATEGORY_NAME_LENGTH)
      return `Le nom ne doit pas dépasser ${MAX_CATEGORY_NAME_LENGTH} caractères`;
    // Pas de caractères de contrôle (\x00-\x1F, \x7F).
    if (/[\x00-\x1F\x7F]/.test(value)) return "Caractères de contrôle interdits";
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
