import type { MenuLocale } from "@/domain/menu/MenuLocale";

/**
 * Port de traduction automatique (S4). Implémentation par défaut : DeepL
 * (`DeepLTranslationService`). Swappable (Google Translate, LLM…) sans toucher
 * au domaine ni aux use cases.
 *
 * Contrat : `translateBatch` retourne un tableau aligné 1-pour-1 sur `texts`
 * (même ordre, même longueur). Les erreurs externes sont converties en
 * `DomainError` (`translation_*`) par l'implémentation.
 */
export interface TranslationService {
  translateBatch(params: {
    sourceLocale: MenuLocale;
    targetLocale: MenuLocale;
    texts: string[];
  }): Promise<string[]>;
}
