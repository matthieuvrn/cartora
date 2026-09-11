import {
  DEFAULT_STATS_PERIOD,
  STATS_PERIODS,
  type DeviceType,
  type StatsPeriod,
  type ViewSource,
  type ViewsDelta,
} from "./AnalyticsTypes";

const TABLET_PATTERN = /tablet|ipad/i;
const MOBILE_PATTERN = /mobile|iphone|ipod|android(?!.*tablet)|windows phone/i;

export class AnalyticsPolicy {
  static parseDeviceType(userAgent: string): DeviceType {
    if (TABLET_PATTERN.test(userAgent)) return "TABLET";
    if (MOBILE_PATTERN.test(userAgent)) return "MOBILE";
    return "DESKTOP";
  }

  static parseViewSource(utmSource?: string, referrer?: string): ViewSource {
    if (utmSource === "qr") return "QR";
    if (referrer && referrer.length > 0) return "LINK";
    return "DIRECT";
  }

  /**
   * RGPD-safe referer collection: keep only the hostname (no path, no query),
   * which is anonymous by construction. Used by landing analytics where the
   * domain referring source is enough signal — full URLs may contain PII.
   * Returns null for empty, unparseable, or non-http(s) inputs.
   */
  static sanitizeRefererToHost(referer?: string): string | null {
    if (!referer || referer.length === 0) return null;
    try {
      const url = new URL(referer);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      const host = url.hostname;
      if (host.length === 0) return null;
      return host.slice(0, 100);
    } catch {
      return null;
    }
  }

  /**
   * Valide le searchParam `?period=` de la page Statistiques. Comparaison sur la représentation
   * EXACTE de chaque période supportée : « 030 », « 30.0 », «  30 » ou un tableau (searchParam
   * répété) ne passent pas. Ne lève jamais : comme `/api/track`, une valeur inconnue retombe
   * silencieusement sur la période par défaut plutôt que de casser la page.
   */
  static parseStatsPeriod(raw: string | string[] | undefined): StatsPeriod {
    if (typeof raw !== "string") return DEFAULT_STATS_PERIOD;
    return STATS_PERIODS.find((period) => String(period) === raw) ?? DEFAULT_STATS_PERIOD;
  }

  /**
   * Variation des vues entre la fenêtre courante et la précédente de même longueur.
   * Le `kind` suit le pourcentage ARRONDI (+0,4 % ⇒ « stable ») : jamais « en hausse de +0 % ».
   * Le pourcentage n'est pas plafonné (mono tabulaire, « +1 200 % » reste lisible) et le zéro
   * négatif de `Math.round(-0.4)` est normalisé — le domaine n'expose pas `-0`.
   */
  static computeViewsDelta(current: number, previous: number): ViewsDelta {
    if (previous === 0 && current === 0) return { kind: "none" };
    if (previous === 0) return { kind: "new" };
    const pct = Math.round(((current - previous) / previous) * 100) || 0;
    return { kind: pct > 0 ? "up" : pct < 0 ? "down" : "flat", pct };
  }
}
