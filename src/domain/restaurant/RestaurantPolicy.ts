import type { ValidationFailure } from "@/domain/errors/DomainError";

export const MAX_DISPLAY_NAME_LENGTH = 50;

export class RestaurantPolicy {
  static validateDisplayName(value: string): ValidationFailure | null {
    const trimmed = value.trim();
    if (!trimmed) return { field: "displayName", code: "display_name_required" };
    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH)
      return { field: "displayName", code: "display_name_too_long" };
    return null;
  }

  static sanitizeDisplayName(value: string): string {
    const trimmed = value.trim();
    return trimmed.length > MAX_DISPLAY_NAME_LENGTH
      ? trimmed.slice(0, MAX_DISPLAY_NAME_LENGTH)
      : trimmed;
  }
}
