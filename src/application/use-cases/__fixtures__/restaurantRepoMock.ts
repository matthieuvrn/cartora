import { vi } from "vitest";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { PlanTier } from "@/domain/billing/PlanPolicy";

export type RestaurantSnapshot = NonNullable<
  Awaited<ReturnType<RestaurantRepository["getRestaurantById"]>>
>;

/**
 * Fixture par défaut représentant un restaurant PRO ACTIVE — couvre la majorité des
 * happy-paths. Override les champs via le paramètre `overrides`.
 */
export function restaurantFixture(overrides: Partial<RestaurantSnapshot> = {}): RestaurantSnapshot {
  return {
    id: "resto-1",
    slug: "resto-abcd1234",
    displayName: "Mon Restaurant",
    planStatus: "ACTIVE" as PlanStatus,
    planTier: "PRO" as PlanTier,
    activationDismissedAt: null,
    logoPath: null,
    brandPrimary: null,
    brandAccent: null,
    brandBackground: null,
    sourceLocale: "fr",
    menuLocales: [],
    qrStyle: null,
    ...overrides,
  };
}

/**
 * Helper pour les tests qui paramètrent par tier (très courant : tests de quotas,
 * gating de templates, gating de daily/formules). Couple automatiquement le
 * `planStatus` au `planTier` selon l'invariant produit : FREE ⇒ status FREE,
 * STARTER/PRO ⇒ status ACTIVE.
 */
export function restaurantFixtureForTier(
  tier: PlanTier,
  overrides: Partial<RestaurantSnapshot> = {},
): RestaurantSnapshot {
  return restaurantFixture({
    planTier: tier,
    planStatus: tier === "FREE" ? "FREE" : "ACTIVE",
    ...overrides,
  });
}

/**
 * Mock par défaut implémentant toute méthode de `RestaurantRepository` comme `vi.fn()`
 * pour permettre `expect(repo.method).toHaveBeenCalledWith(...)` ou `.not.toHaveBeenCalled()`.
 * `getRestaurantById` retourne `restaurantFixture()` par défaut (PRO ACTIVE).
 */
export function createMockRestaurantRepo(
  overrides: Partial<RestaurantRepository> = {},
): RestaurantRepository {
  return {
    findByOwnerUserId: vi.fn(async () => null),
    createWithMenuAndCategories: vi.fn(async () => ({ id: "new-resto-id" })),
    getRestaurantById: vi.fn(async () => restaurantFixture()),
    updateDisplayName: vi.fn(async () => {}),
    updateLogoPath: vi.fn(async () => {}),
    updateBrandColors: vi.fn(async () => {}),
    updateMenuLocales: vi.fn(async () => {}),
    updateQrStyle: vi.fn(async () => {}),
    markActivationDismissed: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    ...overrides,
  };
}
