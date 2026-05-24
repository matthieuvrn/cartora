import { vi } from "vitest";
import type { QrAssetRepository } from "@/application/ports/QrAssetRepository";

/**
 * Mock par défaut implémentant toute méthode de `QrAssetRepository` comme `vi.fn()`.
 * `findByRestaurantId` retourne `null` (pas de QR existant).
 */
export function createMockQrAssetRepo(
  overrides: Partial<QrAssetRepository> = {},
): QrAssetRepository {
  return {
    save: vi.fn(async () => {}),
    findByRestaurantId: vi.fn(async () => null),
    ...overrides,
  };
}
