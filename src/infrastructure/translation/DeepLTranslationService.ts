import type { TranslationService } from "@/application/ports/TranslationService";
import type { MenuLocale } from "@/domain/menu/MenuLocale";
import { DomainError } from "@/domain/errors/DomainError";

/**
 * Adaptateur DeepL API Free (`api-free.deepl.com`). Instancié PARESSEUSEMENT
 * dans l'action (jamais au top-level d'un module) pour que les builds CI sans
 * `DEEPL_API_KEY` n'échouent pas. La clé absente lève `translation_unavailable`
 * AVANT l'instanciation (cf. action).
 *
 * Map de locales : DeepL veut des codes majuscules ; l'anglais cible est `EN-GB`
 * (anglais britannique, registre plus neutre pour une carte européenne).
 */
const DEEPL_LANG: Record<MenuLocale, string> = {
  fr: "FR",
  en: "EN-GB",
  es: "ES",
  de: "DE",
  it: "IT",
};

const BATCH_SIZE = 50;
const TIMEOUT_MS = 15_000;

export class DeepLTranslationService implements TranslationService {
  constructor(private readonly apiKey: string) {}

  async translateBatch(params: {
    sourceLocale: MenuLocale;
    targetLocale: MenuLocale;
    texts: string[];
  }): Promise<string[]> {
    if (params.texts.length === 0) return [];

    const out: string[] = [];
    for (let i = 0; i < params.texts.length; i += BATCH_SIZE) {
      const chunk = params.texts.slice(i, i + BATCH_SIZE);
      out.push(...(await this.translateChunk(params.sourceLocale, params.targetLocale, chunk)));
    }
    return out;
  }

  private async translateChunk(
    sourceLocale: MenuLocale,
    targetLocale: MenuLocale,
    texts: string[],
  ): Promise<string[]> {
    const body = new URLSearchParams();
    for (const text of texts) body.append("text", text);
    body.append("source_lang", DEEPL_LANG[sourceLocale].split("-")[0]); // source = langue de base
    body.append("target_lang", DEEPL_LANG[targetLocale]);

    let res: Response;
    try {
      res = await fetch("https://api-free.deepl.com/v2/translate", {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      // Réseau / timeout / abort → échec générique (capturé par Sentry via l'action).
      throw new DomainError("translation_failed");
    }

    if (res.status === 456) throw new DomainError("translation_quota_exhausted");
    if (res.status === 429) throw new DomainError("translation_rate_limited");
    if (!res.ok) throw new DomainError("translation_failed");

    const json = (await res.json()) as { translations?: { text: string }[] };
    const translations = json.translations ?? [];
    if (translations.length !== texts.length) {
      // Contrat rompu : alignement 1-pour-1 attendu.
      throw new DomainError("translation_failed");
    }
    return translations.map((t) => t.text);
  }
}
