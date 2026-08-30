/**
 * Budget durable de traduction automatique (S4 — anti-abus quota DeepL).
 *
 * Le rate limiter d'action (10 / 10 min) est un garde-fou de RAFALE, structurellement
 * inopérant sur Vercel sans Upstash (état en mémoire par lambda). Cette policy est le
 * garde-fou de FOND : elle borne la consommation DeepL réellement possible par jour et
 * par mois, adossée à un compteur persisté en DB (`TranslationUsageRepository`) qui
 * survit aux cold starts et aux instances multiples.
 *
 * Trois plafonds, du plus global au plus local :
 * - budget mensuel GLOBAL (tous restaurants) : protège le quota/la facture DeepL
 *   (API Free = 500 000 caractères/mois → défaut 400 000, marge de 100 000).
 *   Ajustable via `DEEPL_MONTHLY_CHAR_BUDGET` (composition root) sans redéploiement
 *   de code le jour où la clé passe en payant ;
 * - caractères/jour PAR restaurant : borne le pire cas d'un PRO malveillant qui
 *   éditerait ses textes sources en boucle pour invalider les hash (~20 % du budget
 *   mensuel global max par jour et par restaurant, onboarding d'un gros menu compris :
 *   ~15-20 k caractères par locale × 4 locales) ;
 * - appels/jour PAR restaurant : coupe les boucles de spam même à petit volume
 *   (légitime = 1 appel par locale cible par clic « Traduire », soit 4-5 par passe).
 *
 * Les vérifications se font AVANT l'appel DeepL ; un appel refusé n'enregistre RIEN
 * (le spam post-blocage ne pollue ni le compteur du restaurant ni le budget global).
 */

export const MAX_TRANSLATE_CALLS_PER_DAY = 30;
export const MAX_TRANSLATE_CHARS_PER_DAY = 100_000;
/** DeepL API Free = 500 000 caractères/mois — marge de sécurité de 100 000. */
export const DEFAULT_MONTHLY_CHAR_BUDGET = 400_000;

export type TranslationBudgetViolation = {
  code: "translation_daily_limit_reached" | "translation_quota_exhausted";
  metadata: { limit: number };
};

export type TranslationUsageWindow = {
  /** Appels du restaurant sur le jour applicatif courant (Europe/Paris). */
  dayCalls: number;
  /** Caractères envoyés par le restaurant sur le jour courant. */
  dayChars: number;
  /** Caractères envoyés TOUS restaurants confondus sur le mois courant. */
  monthCharsGlobal: number;
};

export class TranslationBudgetPolicy {
  /** Caractères facturables d'une requête = somme des longueurs des textes sources. */
  static charsOf(texts: readonly string[]): number {
    return texts.reduce((sum, t) => sum + t.length, 0);
  }

  /**
   * Vérifie qu'une requête de `requestChars` caractères tient dans les plafonds.
   * Ordre : budget mensuel global d'abord (le plus sévère — « réessayez demain »
   * serait un mensonge si le mois est épuisé), puis les plafonds quotidiens.
   */
  static check(params: {
    usage: TranslationUsageWindow;
    requestChars: number;
    monthlyCharBudget?: number;
  }): TranslationBudgetViolation | null {
    const budget = params.monthlyCharBudget ?? DEFAULT_MONTHLY_CHAR_BUDGET;

    if (params.usage.monthCharsGlobal + params.requestChars > budget) {
      return { code: "translation_quota_exhausted", metadata: { limit: budget } };
    }
    if (params.usage.dayCalls + 1 > MAX_TRANSLATE_CALLS_PER_DAY) {
      return {
        code: "translation_daily_limit_reached",
        metadata: { limit: MAX_TRANSLATE_CALLS_PER_DAY },
      };
    }
    if (params.usage.dayChars + params.requestChars > MAX_TRANSLATE_CHARS_PER_DAY) {
      return {
        code: "translation_daily_limit_reached",
        metadata: { limit: MAX_TRANSLATE_CHARS_PER_DAY },
      };
    }
    return null;
  }
}
