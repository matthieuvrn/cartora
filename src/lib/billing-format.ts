/**
 * Formats d'affichage de la page Abonnement (dates d'échéance, montants Stripe).
 * Sans framework : appelé côté serveur (locale next-intl) et testable en isolation.
 * Les dates sont exprimées en heure de Paris — comme tout le calendrier de l'app.
 */

const INTL_TAGS: Record<string, string> = { fr: "fr-FR", en: "en-GB" };

/** Étiquette Intl complète — `en` nu donnerait le format US (MM/JJ, 12 h) sur un chrome anglais. */
export function tagFor(locale: string): string {
  return INTL_TAGS[locale] ?? INTL_TAGS.fr;
}

/** « 15 octobre 2026 » / « 15 October 2026 ». Chaîne vide si l'ISO est invalide. */
export function formatBillingDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(tagFor(locale), {
    dateStyle: "long",
    timeZone: "Europe/Paris",
  }).format(date);
}

/** Montant Stripe (centimes + code ISO minuscule) → « 13,27 € » / « €13.27 ». */
export function formatBillingAmount(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(tagFor(locale), {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
