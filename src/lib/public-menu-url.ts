/**
 * URL du menu public — source unique, pour que le littéral `/m/${slug}` ne soit plus réécrit dans
 * chaque composant (barre de publication, cluster de partage, en-tête d'éditeur, toast).
 *
 * Règle : `menuPath` (RELATIF) pour toute NAVIGATION — un lien absolu renverrait l'utilisateur sur
 * `NEXT_PUBLIC_APP_URL`, qui peut différer de l'hôte servi. `absoluteMenuUrl` est réservé au
 * presse-papier, au QR et à l'affichage de l'adresse.
 */

export function menuPath(slug: string): string {
  return `/m/${slug}`;
}

/**
 * Adresse complète du menu. `origin` sert de repli en développement quand
 * `NEXT_PUBLIC_APP_URL` n'est pas défini (typiquement `window.location.origin`).
 */
export function absoluteMenuUrl(slug: string, origin?: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || origin || "";
  return `${base}${menuPath(slug)}`;
}
