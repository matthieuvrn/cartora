export const DEFAULT_DISPLAY_NAME = "Mon Restaurant";

export type InitialCategory = {
  type: "STARTERS" | "MAINS" | "DESSERTS" | "DRINKS";
  order: number;
};

export const INITIAL_CATEGORIES: readonly InitialCategory[] = [
  { type: "STARTERS", order: 0 },
  { type: "MAINS", order: 1 },
  { type: "DESSERTS", order: 2 },
  { type: "DRINKS", order: 3 },
] as const;

export function generateSlug(userId: string): string {
  const short = userId.replace(/-/g, "").slice(0, 8);
  return `resto-${short}`;
}
