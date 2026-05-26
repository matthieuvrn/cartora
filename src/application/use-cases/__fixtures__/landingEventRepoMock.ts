import { vi } from "vitest";
import type { LandingEventRepository } from "@/application/ports/LandingEventRepository";

/**
 * Factory pour le mock `LandingEventRepository`. Méthode `record` exposée en
 * `vi.fn()` pour permettre `expect(repo.record).toHaveBeenCalledWith({...})`
 * en assertion stricte (cf. convention `__fixtures__` documentée dans
 * `menuRepoMock.ts`).
 */
export function createMockLandingEventRepo(
  overrides: Partial<LandingEventRepository> = {},
): LandingEventRepository {
  return {
    record: vi.fn(async () => {}),
    ...overrides,
  };
}
