import { vi } from "vitest";
import type { StorageService } from "@/application/ports/StorageService";

/**
 * Mock par défaut implémentant toute méthode de `StorageService` comme `vi.fn()`.
 * `createSignedUploadUrl` renvoie un URL stub déterministe basé sur le `path`
 * passé (utile pour asserter le path dans le test).
 */
export function createMockStorageService(overrides: Partial<StorageService> = {}): StorageService {
  return {
    upload: vi.fn(async () => {}),
    getPublicUrl: vi.fn((path: string) => `https://storage.test/${path}`),
    delete: vi.fn(async () => {}),
    createSignedUploadUrl: vi.fn(async (path: string) => ({
      uploadUrl: `https://upload.test/${path}`,
      token: "token-abc",
      path,
    })),
    deleteByPrefix: vi.fn(async () => {}),
    ...overrides,
  };
}
