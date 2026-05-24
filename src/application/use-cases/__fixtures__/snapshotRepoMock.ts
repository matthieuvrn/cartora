import { vi } from "vitest";
import type { SnapshotRepository } from "@/application/ports/SnapshotRepository";

/**
 * Mock par défaut implémentant toute méthode de `SnapshotRepository` comme `vi.fn()`.
 * `getSnapshotBySlug` retourne `null` (pas de snapshot). `listPublished` retourne `[]`.
 */
export function createMockSnapshotRepo(
  overrides: Partial<SnapshotRepository> = {},
): SnapshotRepository {
  return {
    upsertSnapshot: vi.fn(async () => {}),
    getSnapshotBySlug: vi.fn(async () => null),
    listPublished: vi.fn(async () => []),
    ...overrides,
  };
}
