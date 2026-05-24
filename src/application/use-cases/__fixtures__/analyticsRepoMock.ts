import { vi } from "vitest";
import type { AnalyticsRepository } from "@/application/ports/AnalyticsRepository";

/**
 * Mock par défaut implémentant toute méthode de `AnalyticsRepository` comme `vi.fn()`.
 * Listes vides par défaut.
 */
export function createMockAnalyticsRepo(
  overrides: Partial<AnalyticsRepository> = {},
): AnalyticsRepository {
  return {
    recordView: vi.fn(async () => {}),
    getDailyStats: vi.fn(async () => []),
    getEventTimestamps: vi.fn(async () => []),
    ...overrides,
  };
}
