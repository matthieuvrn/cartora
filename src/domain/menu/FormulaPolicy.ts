import type { ValidationFailure } from "@/domain/errors/DomainError";

/**
 * Règles des formules de menu (S3.2).
 *
 * Conception : clone littéral de `DailyDishPolicy` (mêmes bornes, même TZ, même
 * fenêtre d'expiration). On garde deux Policies distinctes plutôt que de factoriser
 * pour anticiper une divergence probable (e.g. quotas spécifiques aux formules, ou
 * support futur de formules permanentes via `validUntil` nullable).
 *
 * Différences avec `DailyDishPolicy` : codes d'erreur dédiés (`formula_until_*`)
 * pour traçabilité i18n et UI (messages potentiellement spécifiques aux formules).
 */
export class FormulaPolicy {
  static readonly MAX_NAME_LENGTH = 100;
  static readonly MAX_DESCRIPTION_LENGTH = 500;
  static readonly MIN_PRICE_CENTS = 0;
  static readonly MAX_PRICE_CENTS = 99999;
  static readonly TIMEZONE = "Europe/Paris";
  static readonly MAX_HORIZON_DAYS = 14;

  static validateName(value: string): ValidationFailure | null {
    const trimmed = value.trim();
    if (!trimmed) return { field: "name", code: "name_required" };
    if (trimmed.length > FormulaPolicy.MAX_NAME_LENGTH)
      return { field: "name", code: "name_too_long" };
    return null;
  }

  static validateDescription(value: string): ValidationFailure | null {
    if (value.trim().length > FormulaPolicy.MAX_DESCRIPTION_LENGTH)
      return { field: "description", code: "description_too_long" };
    return null;
  }

  static validatePriceCents(value: number): ValidationFailure | null {
    if (!Number.isInteger(value)) return { field: "priceCents", code: "price_not_integer" };
    if (value < FormulaPolicy.MIN_PRICE_CENTS)
      return { field: "priceCents", code: "price_too_low" };
    if (value > FormulaPolicy.MAX_PRICE_CENTS)
      return { field: "priceCents", code: "price_too_high" };
    return null;
  }

  /**
   * Vérifie que `validUntilISO` est dans le futur et ≤ 14 jours. `nowISO` est
   * injecté pour rester pur et testable via un fake `Clock`.
   */
  static validateValidUntil(validUntilISO: string, nowISO: string): ValidationFailure | null {
    const validUntil = Date.parse(validUntilISO);
    const now = Date.parse(nowISO);
    if (!Number.isFinite(validUntil)) return { field: "validUntil", code: "validation_failed" };
    if (validUntil <= now) return { field: "validUntil", code: "formula_until_in_past" };
    const maxAhead = now + FormulaPolicy.MAX_HORIZON_DAYS * 24 * 60 * 60 * 1000;
    if (validUntil > maxAhead) return { field: "validUntil", code: "formula_until_too_far" };
    return null;
  }

  static sanitizeName(value: string): string {
    const trimmed = value.trim();
    return trimmed.length > FormulaPolicy.MAX_NAME_LENGTH
      ? trimmed.slice(0, FormulaPolicy.MAX_NAME_LENGTH)
      : trimmed;
  }

  static sanitizeDescription(value: string): string {
    const trimmed = value.trim();
    return trimmed.length > FormulaPolicy.MAX_DESCRIPTION_LENGTH
      ? trimmed.slice(0, FormulaPolicy.MAX_DESCRIPTION_LENGTH)
      : trimmed;
  }

  /**
   * Renvoie l'ISO 8601 UTC correspondant à 23:59:59.999 du jour courant en zone
   * Europe/Paris (DST inclus via `Intl.DateTimeFormat`). Default appliqué quand
   * l'utilisateur ne fournit pas d'expiration. Mêmes garanties DST que
   * `DailyDishPolicy.defaultExpirationISO`.
   */
  static defaultExpirationISO(nowISO: string): string {
    const now = new Date(nowISO);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: FormulaPolicy.TIMEZONE,
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

    const endLocal = Date.UTC(y, m - 1, d, 23, 59, 59, 999);
    const offsetMs = parisOffsetAt(endLocal);
    return new Date(endLocal - offsetMs).toISOString();
  }

  /** True si la formule est encore active à `nowISO`. */
  static isActive(entry: { validUntilISO: string }, nowISO: string): boolean {
    return Date.parse(entry.validUntilISO) > Date.parse(nowISO);
  }
}

function parisOffsetAt(utcMs: number): number {
  const utcWhole = Math.floor(utcMs / 1000) * 1000;
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: FormulaPolicy.TIMEZONE,
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
