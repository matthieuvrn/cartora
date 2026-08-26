/**
 * Slug du restaurant vitrine « Le Bistrot Démo » (seedé par `pnpm db:seed-demo`,
 * lié depuis la landing). Source unique pour toute DÉCISION de code qui
 * spécial-case la démo — ex. le sélecteur de designs du menu public, qui ne doit
 * JAMAIS apparaître sur le menu d'un vrai restaurant (n'importe qui pourrait
 * re-skinner la carte d'une marque et faire circuler des captures mensongères).
 * Les liens marketing de la landing gardent leurs URLs littérales (copy).
 */
export const DEMO_MENU_SLUG = "demo-cartora";
