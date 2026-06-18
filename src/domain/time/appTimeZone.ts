/**
 * Fuseau horaire applicatif — **source unique** pour tout calcul d'heure/jour local.
 *
 * Cartora est mono-pays (France) pour l'instant : le fuseau est codé en dur ici plutôt
 * que stocké par restaurant. Le jour où le produit sort de France, généraliser à partir
 * de cette constante (champ `Restaurant.timezone` injecté). `DailyDishPolicy`,
 * `FormulaPolicy` et l'agrégation analytics y font référence — ne pas répliquer le littéral.
 *
 * Implémentation 100 % `Intl.DateTimeFormat` : natif, sans dépendance, **DST-aware**
 * (gère automatiquement le passage été/hiver, contrairement à un offset codé en dur).
 */
export const APP_TIMEZONE = "Europe/Paris";

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

/**
 * Heure locale (0–23) de `date` dans {@link APP_TIMEZONE}, DST inclus.
 * `hourCycle: "h23"` garantit "00".."23" et évite le "24" renvoyé à minuit par `hour12: false`.
 */
export function hourInAppTimeZone(date: Date): number {
  return Number(hourFormatter.format(date));
}

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Renvoie une `Date` à **minuit UTC** correspondant au jour calendaire de `date` en
 * {@link APP_TIMEZONE} — destinée à la colonne `@db.Date` des stats agrégées.
 *
 * Prisma sérialise une colonne `DATE` à partir des composantes UTC de la `Date` JS,
 * d'où le minuit UTC : une vue à 01h30 Paris (= 23h30 UTC la veille) est ainsi rattachée
 * au bon jour calendaire local, et non au jour UTC.
 */
export function appCalendarDateUTC(date: Date): Date {
  // en-CA formate en "YYYY-MM-DD".
  const ymd = dateFormatter.format(date);
  return new Date(`${ymd}T00:00:00.000Z`);
}
