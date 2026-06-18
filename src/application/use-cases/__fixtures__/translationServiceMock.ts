import { vi } from "vitest";
import type { TranslationService } from "@/application/ports/TranslationService";

/**
 * Mock du port `TranslationService`. Par défaut, échoit chaque texte préfixé
 * de `[<targetLocale>] ` — suffisant pour asserter l'alignement et le périmètre
 * sans dépendre d'un vrai moteur. Override `translateBatch` pour les cas d'erreur.
 */
export function createMockTranslationService(
  overrides: Partial<TranslationService> = {},
): TranslationService {
  return {
    translateBatch: vi.fn(async ({ targetLocale, texts }) =>
      texts.map((t: string) => `[${targetLocale}] ${t}`),
    ),
    ...overrides,
  };
}
