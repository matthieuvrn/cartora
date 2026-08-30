import type { TranslationUsageWindow } from "@/domain/menu/TranslationBudgetPolicy";

/**
 * Compteur DURABLE de consommation DeepL (table `translation_usage`), un cran sous
 * le rate limiter d'action : lui survit aux cold starts Vercel et aux instances
 * multiples. Granularité = (restaurant, jour applicatif Europe/Paris).
 *
 * Les clés `day`/`monthStart` sont des jours calendaires "YYYY-MM-DD" produits par
 * `appCalendarDayISO` — même référentiel Paris que les stats (jamais de Date UTC brute).
 */
export interface TranslationUsageRepository {
  /** Photographie de la consommation : jour courant du restaurant + mois global. */
  getUsage(params: {
    restaurantId: string;
    day: string;
    monthStart: string;
  }): Promise<TranslationUsageWindow>;

  /**
   * Incrémente atomiquement le compteur du (restaurant, jour). Appelé AVANT l'envoi
   * à DeepL (réservation pessimiste : un appel DeepL qui échoue reste compté — le
   * sur-comptage est le sens sûr pour un garde-fou de coût).
   */
  recordUsage(params: {
    restaurantId: string;
    day: string;
    calls: number;
    chars: number;
  }): Promise<void>;
}
