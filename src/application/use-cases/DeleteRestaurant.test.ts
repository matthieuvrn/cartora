import { describe, it, expect, vi } from "vitest";
import { DeleteRestaurant } from "./DeleteRestaurant";
import { createMockBillingRepo } from "./__fixtures__/billingRepoMock";
import { createMockRestaurantRepo } from "./__fixtures__/restaurantRepoMock";
import { createMockPaymentGateway } from "./__fixtures__/paymentGatewayMock";
import { createMockStorageService } from "./__fixtures__/storageServiceMock";
import type { BillingRepository } from "@/application/ports/BillingRepository";
import type { PaymentGateway } from "@/application/ports/PaymentGateway";
import type { StorageService } from "@/application/ports/StorageService";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { AuthAdminService } from "@/application/ports/AuthAdminService";

const VALID_INPUT = {
  restaurantId: "resto-1",
  ownerUserId: "user-1",
};

const BILLING_FIXTURE = {
  restaurantId: "resto-1",
  stripeCustomerId: "cus_abc123",
  stripeSubscriptionId: "sub_xyz789",
};

/**
 * AuthAdminService est utilisé uniquement ici — fixture local plutôt que dédié.
 */
function createMockAuthAdmin(overrides: Partial<AuthAdminService> = {}): AuthAdminService {
  return {
    deleteUser: vi.fn(async () => {}),
    ...overrides,
  };
}

function createUseCase(
  overrides: {
    billingRepo?: Partial<BillingRepository>;
    paymentGateway?: Partial<PaymentGateway>;
    logoStorage?: Partial<StorageService>;
    restaurantRepo?: Partial<RestaurantRepository>;
    authAdmin?: Partial<AuthAdminService>;
  } = {},
) {
  const billingRepo = createMockBillingRepo({
    findByRestaurantId: async () => BILLING_FIXTURE,
    ...overrides.billingRepo,
  });
  const paymentGateway = createMockPaymentGateway(overrides.paymentGateway);
  const logoStorage = createMockStorageService(overrides.logoStorage);
  const restaurantRepo = createMockRestaurantRepo({
    getRestaurantById: async () => null,
    ...overrides.restaurantRepo,
  });
  const authAdmin = createMockAuthAdmin(overrides.authAdmin);

  const uc = new DeleteRestaurant(
    billingRepo,
    paymentGateway,
    logoStorage,
    restaurantRepo,
    authAdmin,
  );

  return { uc, billingRepo, paymentGateway, logoStorage, restaurantRepo, authAdmin };
}

describe("DeleteRestaurant", () => {
  it("performs full cleanup (billing + restaurant + logo + user)", async () => {
    const { uc, paymentGateway, logoStorage, restaurantRepo, authAdmin } = createUseCase();

    const result = await uc.execute(VALID_INPUT);

    expect(result).toEqual({ status: "completed", errors: [] });
    expect(paymentGateway.cancelSubscription).toHaveBeenCalledWith("sub_xyz789");
    expect(paymentGateway.deleteCustomer).toHaveBeenCalledWith("cus_abc123");
    expect(restaurantRepo.delete).toHaveBeenCalledWith("resto-1");
    expect(logoStorage.deleteByPrefix).toHaveBeenCalledWith("resto-1/");
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("skips Stripe and still cleans restaurant + logo + user when no billing exists", async () => {
    const { uc, paymentGateway, logoStorage, restaurantRepo, authAdmin } = createUseCase({
      billingRepo: { findByRestaurantId: async () => null },
    });

    const result = await uc.execute(VALID_INPUT);

    expect(result).toEqual({ status: "completed", errors: [] });
    expect(paymentGateway.cancelSubscription).not.toHaveBeenCalled();
    expect(paymentGateway.deleteCustomer).not.toHaveBeenCalled();
    expect(logoStorage.deleteByPrefix).toHaveBeenCalledWith("resto-1/");
    expect(restaurantRepo.delete).toHaveBeenCalledWith("resto-1");
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("skips Stripe entirely when the billing row exists but both Stripe ids are null", async () => {
    // État représentable (les deux colonnes sont nullables) — ne doit JAMAIS bloquer
    // la suppression d'un compte qui n'a rien côté Stripe (droit à l'effacement).
    const { uc, paymentGateway, logoStorage, restaurantRepo, authAdmin } = createUseCase({
      billingRepo: {
        findByRestaurantId: async () => ({
          restaurantId: "resto-1",
          stripeCustomerId: null,
          stripeSubscriptionId: null,
        }),
      },
    });

    const result = await uc.execute(VALID_INPUT);

    expect(result).toEqual({ status: "completed", errors: [] });
    expect(paymentGateway.cancelSubscription).not.toHaveBeenCalled();
    expect(paymentGateway.deleteCustomer).not.toHaveBeenCalled();
    expect(restaurantRepo.delete).toHaveBeenCalledWith("resto-1");
    expect(logoStorage.deleteByPrefix).toHaveBeenCalledWith("resto-1/");
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("skips cancelSubscription when stripeSubscriptionId is absent", async () => {
    const { uc, paymentGateway, restaurantRepo, authAdmin } = createUseCase({
      billingRepo: {
        findByRestaurantId: async () => ({
          restaurantId: "resto-1",
          stripeCustomerId: "cus_abc123",
          stripeSubscriptionId: null,
        }),
      },
    });

    const result = await uc.execute(VALID_INPUT);

    expect(result).toEqual({ status: "completed", errors: [] });
    expect(paymentGateway.cancelSubscription).not.toHaveBeenCalled();
    expect(paymentGateway.deleteCustomer).toHaveBeenCalledWith("cus_abc123");
    expect(restaurantRepo.delete).toHaveBeenCalledWith("resto-1");
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("skips deleteCustomer when stripeCustomerId is absent", async () => {
    const { uc, paymentGateway, restaurantRepo, authAdmin } = createUseCase({
      billingRepo: {
        findByRestaurantId: async () => ({
          restaurantId: "resto-1",
          stripeCustomerId: null,
          stripeSubscriptionId: "sub_xyz789",
        }),
      },
    });

    const result = await uc.execute(VALID_INPUT);

    expect(result).toEqual({ status: "completed", errors: [] });
    expect(paymentGateway.cancelSubscription).toHaveBeenCalledWith("sub_xyz789");
    expect(paymentGateway.deleteCustomer).not.toHaveBeenCalled();
    expect(restaurantRepo.delete).toHaveBeenCalledWith("resto-1");
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("ABORTS with stripe_cleanup_failed when cancelSubscription throws — nothing local is destroyed", async () => {
    // Invariant central : jamais de destruction locale tant que Stripe facture encore.
    const { uc, paymentGateway, logoStorage, restaurantRepo, authAdmin } = createUseCase({
      paymentGateway: {
        cancelSubscription: vi.fn(async () => {
          throw new Error("Stripe API error");
        }),
      },
    });

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "stripe_cleanup_failed",
      metadata: { entityId: "resto-1" },
    });
    expect(paymentGateway.deleteCustomer).not.toHaveBeenCalled();
    expect(restaurantRepo.delete).not.toHaveBeenCalled();
    expect(logoStorage.deleteByPrefix).not.toHaveBeenCalled();
    expect(authAdmin.deleteUser).not.toHaveBeenCalled();
  });

  it("ABORTS with stripe_cleanup_failed when deleteCustomer throws — nothing local is destroyed", async () => {
    const { uc, restaurantRepo, logoStorage, authAdmin } = createUseCase({
      paymentGateway: {
        deleteCustomer: vi.fn(async () => {
          throw new Error("Stripe API error");
        }),
      },
    });

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({
      name: "DomainError",
      code: "stripe_cleanup_failed",
      metadata: { entityId: "resto-1" },
    });
    expect(restaurantRepo.delete).not.toHaveBeenCalled();
    expect(logoStorage.deleteByPrefix).not.toHaveBeenCalled();
    expect(authAdmin.deleteUser).not.toHaveBeenCalled();
  });

  it("attaches the original Stripe error as cause of the DomainError", async () => {
    const stripeError = new Error("card_gateway_meltdown");
    const { uc } = createUseCase({
      paymentGateway: {
        cancelSubscription: vi.fn(async () => {
          throw stripeError;
        }),
      },
    });

    await expect(uc.execute(VALID_INPUT)).rejects.toMatchObject({ cause: stripeError });
  });

  it("propagates restaurantRepo.delete failure — logo and auth cleanup are not attempted", async () => {
    // Stripe est déjà nettoyé à ce stade : un retry de l'utilisateur converge
    // (cancel/deleteCustomer idempotents), donc on propage sans compensation.
    const { uc, paymentGateway, logoStorage, authAdmin } = createUseCase({
      restaurantRepo: {
        delete: vi.fn(async () => {
          throw new Error("DB timeout");
        }),
      },
    });

    await expect(uc.execute(VALID_INPUT)).rejects.toThrow("DB timeout");
    expect(paymentGateway.cancelSubscription).toHaveBeenCalledWith("sub_xyz789");
    expect(paymentGateway.deleteCustomer).toHaveBeenCalledWith("cus_abc123");
    expect(logoStorage.deleteByPrefix).not.toHaveBeenCalled();
    expect(authAdmin.deleteUser).not.toHaveBeenCalled();
  });

  it("captures logo cleanup error and still deletes user", async () => {
    const { uc, restaurantRepo, authAdmin } = createUseCase({
      logoStorage: {
        deleteByPrefix: vi.fn(async () => {
          throw new Error("Bucket list failed");
        }),
      },
    });

    const result = await uc.execute(VALID_INPUT);

    // Assertion stricte sur le message complet : la partie après les deux-points est la
    // seule donnée de diagnostic qui atteint Sentry (partialCleanup) — ne pas la perdre.
    expect(result).toEqual({
      status: "completed",
      errors: ["Logo cleanup failed: Bucket list failed"],
    });
    expect(restaurantRepo.delete).toHaveBeenCalledWith("resto-1");
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("captures auth user deletion error after the restaurant is already deleted", async () => {
    const { uc, restaurantRepo } = createUseCase({
      authAdmin: {
        deleteUser: vi.fn(async () => {
          throw new Error("GoTrue unavailable");
        }),
      },
    });

    const result = await uc.execute(VALID_INPUT);

    expect(result).toEqual({
      status: "completed",
      errors: ["Auth user deletion failed: GoTrue unavailable"],
    });
    expect(restaurantRepo.delete).toHaveBeenCalledWith("resto-1");
  });

  it("captures both logo and auth errors while the deletion itself completes", async () => {
    const { uc, restaurantRepo } = createUseCase({
      logoStorage: {
        deleteByPrefix: vi.fn(async () => {
          throw new Error("Bucket down");
        }),
      },
      authAdmin: {
        deleteUser: vi.fn(async () => {
          throw new Error("GoTrue down");
        }),
      },
    });

    const result = await uc.execute(VALID_INPUT);

    expect(result).toEqual({
      status: "completed",
      errors: ["Logo cleanup failed: Bucket down", "Auth user deletion failed: GoTrue down"],
    });
    expect(restaurantRepo.delete).toHaveBeenCalledWith("resto-1");
  });
});
