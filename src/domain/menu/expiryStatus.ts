import { appCalendarDayISO } from "@/domain/time/appTimeZone";

/**
 * Statut d'expiration « aujourd'hui » d'une entrée datée (plat du jour, formule) — calculé à la
 * volée côté éditeur, jamais stocké.
 *
 * Vrai si l'entrée est ENCORE active à `nowISO` (inégalité stricte, même sémantique que
 * `DailyDishPolicy.isActive` / `FormulaPolicy.isActive`) ET si son `validUntil` tombe le même jour
 * calendaire Europe/Paris que `nowISO` (`appCalendarDayISO`, DST-safe). Une entrée déjà dépassée
 * n'est jamais « aujourd'hui » : elle est expirée.
 *
 * Helper partagé volontairement placé hors des deux policies (gardées distinctes, cf. le docblock
 * de `FormulaPolicy`) : il n'en importe aucune. `nowISO` est injecté (horloge serveur via le port
 * `Clock`) — module pur, testable sans mock de `Date`.
 */
export function expiresToday(entry: { validUntilISO: string }, nowISO: string): boolean {
  const validUntil = Date.parse(entry.validUntilISO);
  const now = Date.parse(nowISO);
  // Gardes indispensables (pas de simple confort) : `appCalendarDayISO(new Date(NaN))` lèverait
  // une RangeError dans `Intl.DateTimeFormat.format`.
  if (!Number.isFinite(validUntil) || !Number.isFinite(now)) return false;
  if (validUntil <= now) return false;
  return appCalendarDayISO(new Date(validUntil)) === appCalendarDayISO(new Date(now));
}
