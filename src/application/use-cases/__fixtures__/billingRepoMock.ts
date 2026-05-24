import { vi } from "vitest";
import type { BillingRepository } from "@/application/ports/BillingRepository";

/**
 * Mock par défaut implémentant toute méthode de `BillingRepository` comme `vi.fn()`.
 * `findByRestaurantId` retourne `null` (pas de billing). Override via `overrides`.
 */
export function createMockBillingRepo(
  overrides: Partial<BillingRepository> = {},
): BillingRepository {
  return {
    upsertBilling: vi.fn(async () => {}),
    findByRestaurantId: vi.fn(async () => null),
    updateRestaurantPlan: vi.fn(async () => {}),
    ...overrides,
  };
}
