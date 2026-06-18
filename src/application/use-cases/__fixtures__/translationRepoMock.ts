import { vi } from "vitest";
import type {
  TranslationRepository,
  TranslationRow,
} from "@/application/ports/TranslationRepository";

/** Ligne de traduction par défaut — override les champs via `overrides`. */
export function translationRowFixture(overrides: Partial<TranslationRow> = {}): TranslationRow {
  return {
    entityType: "ITEM",
    entityId: "item-1",
    field: "name",
    locale: "en",
    value: "Niçoise salad",
    sourceTextHash: null,
    ...overrides,
  };
}

/**
 * Mock par défaut implémentant toute méthode de `TranslationRepository` comme
 * `vi.fn()` (cf. convention dans menuRepoMock.ts). `listForRestaurant` retourne
 * `[]` par défaut.
 */
export function createMockTranslationRepo(
  overrides: Partial<TranslationRepository> = {},
): TranslationRepository {
  return {
    listForRestaurant: vi.fn(async () => []),
    upsertMany: vi.fn(async () => {}),
    ...overrides,
  };
}
