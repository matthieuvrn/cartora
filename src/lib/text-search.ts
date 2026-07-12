/**
 * Recherche plein-texte côté client de l'éditeur de carte : insensible à la
 * casse et aux diacritiques (« crème » ↔ « creme »). Pur et sans dépendance —
 * testé unitairement (scope vitest `src/lib`).
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Une requête vide (après trim) matche tout. */
export function matchesQuery(text: string, query: string): boolean {
  const normalizedQuery = normalizeForSearch(query);
  if (normalizedQuery.length === 0) return true;
  return normalizeForSearch(text).includes(normalizedQuery);
}
