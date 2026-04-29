export const DEFAULT_DISPLAY_NAME = "Mon Restaurant";

export type InitialCategory = {
  name: string;
  order: number;
};

export const INITIAL_CATEGORIES: readonly InitialCategory[] = [
  { name: "Entrées", order: 0 },
  { name: "Plats", order: 1 },
  { name: "Desserts", order: 2 },
  { name: "Boissons", order: 3 },
] as const;

export function generateSlug(userId: string): string {
  const short = userId.replace(/-/g, "").slice(0, 8);
  return `resto-${short}`;
}
