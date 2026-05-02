export const DEFAULT_DISPLAY_NAME = "Mon Restaurant";

export type RestaurantType =
  | "TRADITIONAL"
  | "PIZZERIA"
  | "BRASSERIE"
  | "BAR"
  | "CAFE"
  | "CREPERIE"
  | "FASTFOOD"
  | "BAKERY";

export const RESTAURANT_TYPES: readonly RestaurantType[] = [
  "TRADITIONAL",
  "PIZZERIA",
  "BRASSERIE",
  "BAR",
  "CAFE",
  "CREPERIE",
  "FASTFOOD",
  "BAKERY",
] as const;

export type CategoryKey =
  | "starters"
  | "mains"
  | "desserts"
  | "drinks"
  | "pizzas"
  | "pasta"
  | "antipasti"
  | "cocktails"
  | "beers"
  | "wines"
  | "softs"
  | "boards"
  | "hotDrinks"
  | "pastries"
  | "brunch"
  | "burgers"
  | "sides"
  | "breads"
  | "viennoiseries"
  | "crepesSweet"
  | "crepesSavory"
  | "ciders";

export type InitialCategoryKey = {
  key: CategoryKey;
  order: number;
};

export type InitialCategory = {
  name: string;
  order: number;
};

const TRADITIONAL_KEYS: readonly InitialCategoryKey[] = [
  { key: "starters", order: 0 },
  { key: "mains", order: 1 },
  { key: "desserts", order: 2 },
  { key: "drinks", order: 3 },
];

const KEYS_BY_TYPE: Record<RestaurantType, readonly InitialCategoryKey[]> = {
  TRADITIONAL: TRADITIONAL_KEYS,
  PIZZERIA: [
    { key: "pizzas", order: 0 },
    { key: "pasta", order: 1 },
    { key: "antipasti", order: 2 },
    { key: "desserts", order: 3 },
    { key: "drinks", order: 4 },
  ],
  BRASSERIE: [
    { key: "starters", order: 0 },
    { key: "mains", order: 1 },
    { key: "desserts", order: 2 },
    { key: "beers", order: 3 },
    { key: "wines", order: 4 },
  ],
  BAR: [
    { key: "cocktails", order: 0 },
    { key: "beers", order: 1 },
    { key: "wines", order: 2 },
    { key: "softs", order: 3 },
    { key: "boards", order: 4 },
  ],
  CAFE: [
    { key: "hotDrinks", order: 0 },
    { key: "pastries", order: 1 },
    { key: "brunch", order: 2 },
    { key: "softs", order: 3 },
  ],
  CREPERIE: [
    { key: "crepesSavory", order: 0 },
    { key: "crepesSweet", order: 1 },
    { key: "ciders", order: 2 },
    { key: "drinks", order: 3 },
  ],
  FASTFOOD: [
    { key: "burgers", order: 0 },
    { key: "sides", order: 1 },
    { key: "drinks", order: 2 },
    { key: "desserts", order: 3 },
  ],
  BAKERY: [
    { key: "breads", order: 0 },
    { key: "viennoiseries", order: 1 },
    { key: "pastries", order: 2 },
    { key: "drinks", order: 3 },
  ],
};

export function defaultCategoryKeysFor(
  type: RestaurantType | null | undefined,
): readonly InitialCategoryKey[] {
  if (!type) return TRADITIONAL_KEYS;
  return KEYS_BY_TYPE[type];
}

export function generateSlug(userId: string): string {
  const short = userId.replace(/-/g, "").slice(0, 8);
  return `resto-${short}`;
}
