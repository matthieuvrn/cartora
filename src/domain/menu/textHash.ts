/**
 * Hash du texte SOURCE au moment où une traduction est produite/validée, stocké
 * avec la ligne de traduction (`translations.source_text_hash`). La fraîcheur
 * d'une traduction est ensuite CALCULÉE (jamais stockée) : hash égal ⇒ `fresh`,
 * différent ⇒ `stale`. Modifier le texte source invalide donc toutes ses
 * traductions sans écrire une seule ligne.
 *
 * FNV-1a 32 bits sur les code units UTF-16 du texte trimé : pur TS (pas de
 * `node:crypto` — le domaine doit tourner partout, browser compris), déterministe,
 * ~10 lignes. Une collision ne produirait qu'un faux « fresh » — improbable et
 * bénin sur des textes de menu.
 */
export function hashSourceText(text: string): string {
  const normalized = text.trim();
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // >>> 0 : réinterprète en uint32 (Math.imul travaille en signé).
  return (hash >>> 0).toString(16).padStart(8, "0");
}
