export type DeviceType = "MOBILE" | "DESKTOP" | "TABLET";
export type ViewSource = "QR" | "DIRECT" | "LINK";

/**
 * Fenêtres d'analyse offertes par la page Statistiques (jours calendaires Paris, bornes incluses).
 * Bornées par la rétention des agrégats journaliers (24 mois, migration 055) : la fenêtre
 * précédente de même longueur doit rester couverte. Ajouter 90 j = une ligne ici (+ recette de
 * l'axe X), le reste du code lit toujours ce tableau.
 */
export const STATS_PERIODS = [7, 30] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];
export const DEFAULT_STATS_PERIOD: StatsPeriod = 7;

/**
 * Variation des vues vs la période précédente de MÊME longueur — union discriminée : jamais de
 * pourcentage infini. `none` = rien à comparer (0 vue des deux côtés) ; `new` = première période
 * mesurée (0 avant, des vues maintenant) ; les trois autres portent un pourcentage entier signé.
 */
export type ViewsDelta =
  | { kind: "none" } // 0 vue sur les deux fenêtres : rien à comparer
  | { kind: "new" } // 0 vue avant, des vues maintenant : pas de pourcentage calculable
  | { kind: "up" | "down" | "flat"; pct: number }; // pct entier signé, kind dérivé du pct ARRONDI

export interface DailyStatRow {
  date: string; // ISO date "YYYY-MM-DD"
  locale: string;
  deviceType: DeviceType;
  source: ViewSource;
  viewCount: number;
}

export interface DashboardStats {
  totalViews: number;
  viewsByDay: { date: string; count: number }[];
  byLocale: Record<string, number>;
  byDevice: Record<DeviceType, number>;
  bySource: Record<ViewSource, number>;
  /** Fenêtre effectivement agrégée — l'UI en dérive tous ses libellés (« 30 derniers jours »). */
  period: StatsPeriod;
  /** Total de vues sur la fenêtre précédente de même longueur (dénominateur du delta). */
  previousTotalViews: number;
  /** Variation vs cette fenêtre précédente, calculée par `AnalyticsPolicy.computeViewsDelta`. */
  viewsDelta: ViewsDelta;
}

export interface HourlyCount {
  hour: number; // 0-23
  count: number;
}

export interface RealtimeStats {
  viewsLast60Min: number;
  viewsLast24h: number;
  hourlyDistribution: HourlyCount[]; // 24 entries, aggregated over last 7 days
  peakHour: number | null; // 0-23
}
