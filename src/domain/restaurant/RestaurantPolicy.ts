export const MAX_DISPLAY_NAME_LENGTH = 50;

export class RestaurantPolicy {
  static validateDisplayName(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return "Le nom du restaurant est obligatoire";
    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH)
      return `Le nom du restaurant ne doit pas dépasser ${MAX_DISPLAY_NAME_LENGTH} caractères`;
    return null;
  }

  static sanitizeDisplayName(value: string): string {
    const trimmed = value.trim();
    return trimmed.length > MAX_DISPLAY_NAME_LENGTH
      ? trimmed.slice(0, MAX_DISPLAY_NAME_LENGTH)
      : trimmed;
  }
}
