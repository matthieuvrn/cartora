/**
 * Formate un instant passé en libellé relatif localisé et court : « il y a 2 h »,
 * « il y a 5 min », « hier », « maintenant ». Natif via `Intl.RelativeTimeFormat`
 * (zéro dépendance — pas de date-fns/dayjs dans le repo). Toujours ramené au passé
 * pour un `publishedAt` (une horloge client en avance ⇒ « maintenant »), et renvoie
 * "" si l'ISO est invalide.
 *
 * `now` est injectable pour les tests (défaut `Date.now()`).
 */
export function formatRelativeTime(iso: string, locale: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  // Négatif = passé. On borne à 0 pour ne jamais afficher un futur.
  const absSec = Math.abs(Math.min(Math.round((then - now) / 1000), 0));

  if (absSec < 60) return rtf.format(0, "second"); // « maintenant » / « now »

  const min = Math.round(absSec / 60);
  if (min < 60) return rtf.format(-min, "minute");

  const hr = Math.round(absSec / 3600);
  if (hr < 24) return rtf.format(-hr, "hour");

  const day = Math.round(absSec / 86400);
  if (day < 30) return rtf.format(-day, "day");

  const month = Math.round(absSec / (86400 * 30));
  if (month < 12) return rtf.format(-month, "month");

  return rtf.format(-Math.round(absSec / (86400 * 365)), "year");
}
