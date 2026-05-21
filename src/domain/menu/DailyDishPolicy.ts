import type { ValidationFailure } from "@/domain/errors/DomainError";

/**
 * Règles du menu du jour (S3.1).
 *
 * Conception :
 *  - **TZ Europe/Paris hardcodée**. Isolée ici via la constante `TIMEZONE` pour
 *    pouvoir être généralisée plus tard (multi-pays). Ne pas répliquer ailleurs.
 *  - **`validUntil` est obligatoire** côté domaine — un plat du jour sans expiration
 *    n'a aucun sens métier. Default UI = fin de la journée courante en TZ Paris.
 *  - **Fenêtre maximale de 14 jours** : empêche un restaurateur de « publier »
 *    un plat du jour pour dans 6 mois (anti-misuse, pas de protection RGPD).
 *  - Réutilise la palette de validation de `ItemPolicy` (mêmes bornes nom/desc/prix)
 *    pour cohérence UX. Les codes d'erreur sont partagés (cf. `DomainError.ts`).
 */
export class DailyDishPolicy {
  static readonly MAX_NAME_LENGTH = 100;
  static readonly MAX_DESCRIPTION_LENGTH = 500;
  static readonly MIN_PRICE_CENTS = 0;
  static readonly MAX_PRICE_CENTS = 99999;
  static readonly TIMEZONE = "Europe/Paris";
  static readonly MAX_HORIZON_DAYS = 14;

  static validateName(value: string): ValidationFailure | null {
    const trimmed = value.trim();
    if (!trimmed) return { field: "name", code: "name_required" };
    if (trimmed.length > DailyDishPolicy.MAX_NAME_LENGTH)
      return { field: "name", code: "name_too_long" };
    return null;
  }

  static validateDescription(value: string): ValidationFailure | null {
    if (value.trim().length > DailyDishPolicy.MAX_DESCRIPTION_LENGTH)
      return { field: "description", code: "description_too_long" };
    return null;
  }

  static validatePriceCents(value: number): ValidationFailure | null {
    if (!Number.isInteger(value)) return { field: "priceCents", code: "price_not_integer" };
    if (value < DailyDishPolicy.MIN_PRICE_CENTS)
      return { field: "priceCents", code: "price_too_low" };
    if (value > DailyDishPolicy.MAX_PRICE_CENTS)
      return { field: "priceCents", code: "price_too_high" };
    return null;
  }

  /**
   * Vérifie que `validUntilISO` est dans le futur et pas trop loin (≤ 14 jours).
   * Reçoit `nowISO` injecté pour rester pur et testable avec un fake `Clock`.
   */
  static validateValidUntil(validUntilISO: string, nowISO: string): ValidationFailure | null {
    const validUntil = Date.parse(validUntilISO);
    const now = Date.parse(nowISO);
    if (!Number.isFinite(validUntil)) return { field: "validUntil", code: "validation_failed" };
    if (validUntil <= now) return { field: "validUntil", code: "daily_dish_until_in_past" };
    const maxAhead = now + DailyDishPolicy.MAX_HORIZON_DAYS * 24 * 60 * 60 * 1000;
    if (validUntil > maxAhead) return { field: "validUntil", code: "daily_dish_until_too_far" };
    return null;
  }

  static sanitizeName(value: string): string {
    const trimmed = value.trim();
    return trimmed.length > DailyDishPolicy.MAX_NAME_LENGTH
      ? trimmed.slice(0, DailyDishPolicy.MAX_NAME_LENGTH)
      : trimmed;
  }

  static sanitizeDescription(value: string): string {
    const trimmed = value.trim();
    return trimmed.length > DailyDishPolicy.MAX_DESCRIPTION_LENGTH
      ? trimmed.slice(0, DailyDishPolicy.MAX_DESCRIPTION_LENGTH)
      : trimmed;
  }

  /**
   * Renvoie l'ISO 8601 UTC correspondant à 23:59:59.999 du jour courant, en zone
   * Europe/Paris (DST inclus via `Intl.DateTimeFormat`). C'est le default appliqué
   * quand l'utilisateur ne fournit pas d'expiration.
   *
   * Implémentation : on extrait année/mois/jour dans la TZ via `Intl`, on
   * construit la fin de journée en UTC, on remet l'offset Paris en soustrayant.
   * Plus robuste que des heuristiques `+02:00` qui cassent autour des changements d'heure.
   */
  static defaultExpirationISO(nowISO: string): string {
    const now = new Date(nowISO);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: DailyDishPolicy.TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
    const y = Number(get("year"));
    const m = Number(get("month"));
    const d = Number(get("day"));

    // Fin de la journée Paris exprimée en composantes locales.
    const endLocal = Date.UTC(y, m - 1, d, 23, 59, 59, 999);
    // Calcule l'offset (Paris vs UTC) à `endLocal` en interrogeant Intl.
    const offsetMs = parisOffsetAt(endLocal);
    return new Date(endLocal - offsetMs).toISOString();
  }

  /** True si l'entrée est encore active à `nowISO` (snapshot side : champ `validUntilISO`). */
  static isActive(entry: { validUntilISO: string }, nowISO: string): boolean {
    return Date.parse(entry.validUntilISO) > Date.parse(nowISO);
  }
}

/**
 * Renvoie l'offset (en ms) de la TZ Europe/Paris par rapport à UTC à l'instant `utcMs`.
 * Positif quand Paris est en avance sur UTC (+01:00 hiver, +02:00 été).
 *
 * Note : `Intl.DateTimeFormat` n'expose pas les millisecondes ; on calcule donc
 * l'offset sur la base de la seconde entière (les ms sont gommées avant comparaison).
 * Les transitions DST se font à la seconde près, c'est suffisant.
 */
function parisOffsetAt(utcMs: number): number {
  const utcWhole = Math.floor(utcMs / 1000) * 1000;
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: DailyDishPolicy.TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date(utcWhole));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  let hour = Number(get("hour"));
  // Intl renvoie parfois "24" au lieu de "00" pour minuit en hour12:false.
  if (hour === 24) hour = 0;
  const localAsUtc = Date.UTC(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    hour,
    Number(get("minute")),
    Number(get("second")),
  );
  return localAsUtc - utcWhole;
}
