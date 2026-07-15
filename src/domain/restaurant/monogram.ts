/**
 * Dérive un monogramme (1–2 initiales majuscules) à partir du nom du restaurant.
 * Sert d'avatar de repli **côté app** (éditeur / aperçu) quand aucun logo n'est
 * défini — jamais imposé sur le menu public.
 *
 * Règle : première lettre/chiffre des deux premiers mots significatifs. La
 * ponctuation et les emojis en tête de mot sont ignorés ; les accents sont
 * préservés (« É » reste « É »). Retourne "" si le nom ne contient aucun
 * caractère alphanumérique.
 */
const ALNUM_RE = /[\p{L}\p{N}]/u;

export function restaurantMonogram(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((word) => word.match(ALNUM_RE)?.[0] ?? "")
    .filter((char) => char.length > 0)
    .slice(0, 2)
    .join("");

  return initials.toLocaleUpperCase("fr-FR");
}
