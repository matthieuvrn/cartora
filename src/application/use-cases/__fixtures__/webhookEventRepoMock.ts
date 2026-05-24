import { vi } from "vitest";
import type { WebhookEventRepository } from "@/application/ports/WebhookEventRepository";

/**
 * Mock par défaut implémentant toute méthode de `WebhookEventRepository` comme `vi.fn()`.
 * `isAlreadyProcessed` retourne `false` (event non vu). Override via `overrides`.
 */
export function createMockWebhookEventRepo(
  overrides: Partial<WebhookEventRepository> = {},
): WebhookEventRepository {
  return {
    isAlreadyProcessed: vi.fn(async () => false),
    markProcessed: vi.fn(async () => {}),
    ...overrides,
  };
}
