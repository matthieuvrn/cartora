import { describe, it, expect, vi } from "vitest";
import { DeleteRestaurant } from "./DeleteRestaurant";
import type { BillingRepository } from "@/application/ports/BillingRepository";
import type { QrAssetRepository } from "@/application/ports/QrAssetRepository";
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

const QR_ASSET_FIXTURE = {
  restaurantId: "resto-1",
  storagePath: "qr-codes/resto-1.png",
};

function createMockBillingRepo(overrides: Partial<BillingRepository> = {}): BillingRepository {
  return {
    upsertBilling: async () => {},
    findByRestaurantId: async () => BILLING_FIXTURE,
    updateRestaurantPlan: async () => {},
    ...overrides,
  };
}

function createMockQrAssetRepo(overrides: Partial<QrAssetRepository> = {}): QrAssetRepository {
  return {
    save: async () => {},
    findByRestaurantId: async () => QR_ASSET_FIXTURE,
    ...overrides,
  };
}

function createMockPaymentGateway(overrides: Partial<PaymentGateway> = {}): PaymentGateway {
  return {
    createCheckoutSession: async () => ({ url: "" }),
    createPortalSession: async () => ({ url: "" }),
    verifyWebhookSignature: () => ({
      id: "",
      type: "",
      created: 0,
      data: {},
      priceId: null,
      customerId: null,
      subscriptionId: null,
      restaurantIdMetadata: null,
    }),
    fetchSubscriptionPriceId: async () => null,
    cancelSubscription: vi.fn(async () => {}),
    deleteCustomer: vi.fn(async () => {}),
    ...overrides,
  };
}

function createMockStorageService(overrides: Partial<StorageService> = {}): StorageService {
  return {
    upload: async () => {},
    getPublicUrl: () => "",
    delete: vi.fn(async () => {}),
    createSignedUploadUrl: async () => ({ uploadUrl: "", token: "", path: "" }),
    deleteByPrefix: vi.fn(async () => {}),
    ...overrides,
  };
}

function createMockRestaurantRepo(
  overrides: Partial<RestaurantRepository> = {},
): RestaurantRepository {
  return {
    findByOwnerUserId: async () => null,
    createWithMenuAndCategories: async () => ({ id: "id" }),
    getRestaurantById: async () => null,
    updateDisplayName: async () => {},
    updateLogoPath: async () => {},
    updateBrandColors: async () => {},
    markActivationDismissed: async () => {},
    delete: vi.fn(async () => {}),
    ...overrides,
  };
}

function createMockAuthAdmin(overrides: Partial<AuthAdminService> = {}): AuthAdminService {
  return {
    deleteUser: vi.fn(async () => {}),
    ...overrides,
  };
}

function createUseCase(
  overrides: {
    billingRepo?: Partial<BillingRepository>;
    qrAssetRepo?: Partial<QrAssetRepository>;
    paymentGateway?: Partial<PaymentGateway>;
    qrStorage?: Partial<StorageService>;
    itemImageStorage?: Partial<StorageService>;
    logoStorage?: Partial<StorageService>;
    restaurantRepo?: Partial<RestaurantRepository>;
    authAdmin?: Partial<AuthAdminService>;
  } = {},
) {
  const billingRepo = createMockBillingRepo(overrides.billingRepo);
  const qrAssetRepo = createMockQrAssetRepo(overrides.qrAssetRepo);
  const paymentGateway = createMockPaymentGateway(overrides.paymentGateway);
  const qrStorage = createMockStorageService(overrides.qrStorage);
  const itemImageStorage = createMockStorageService(overrides.itemImageStorage);
  const logoStorage = createMockStorageService(overrides.logoStorage);
  const restaurantRepo = createMockRestaurantRepo(overrides.restaurantRepo);
  const authAdmin = createMockAuthAdmin(overrides.authAdmin);

  const uc = new DeleteRestaurant(
    billingRepo,
    qrAssetRepo,
    paymentGateway,
    qrStorage,
    itemImageStorage,
    logoStorage,
    restaurantRepo,
    authAdmin,
  );

  return {
    uc,
    billingRepo,
    qrAssetRepo,
    paymentGateway,
    qrStorage,
    itemImageStorage,
    logoStorage,
    restaurantRepo,
    authAdmin,
  };
}

describe("DeleteRestaurant", () => {
  it("performs full cleanup (billing + QR + item images + logo + restaurant + user)", async () => {
    const {
      uc,
      paymentGateway,
      qrStorage,
      itemImageStorage,
      logoStorage,
      restaurantRepo,
      authAdmin,
    } = createUseCase();

    const result = await uc.execute(VALID_INPUT);

    expect(result).toEqual({ status: "completed", errors: [] });
    expect(paymentGateway.cancelSubscription).toHaveBeenCalledWith("sub_xyz789");
    expect(paymentGateway.deleteCustomer).toHaveBeenCalledWith("cus_abc123");
    expect(qrStorage.delete).toHaveBeenCalledWith("qr-codes/resto-1.png");
    expect(itemImageStorage.deleteByPrefix).toHaveBeenCalledWith("resto-1/");
    expect(logoStorage.deleteByPrefix).toHaveBeenCalledWith("resto-1/");
    expect(restaurantRepo.delete).toHaveBeenCalledWith("resto-1");
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("cleans only storage when no billing exists", async () => {
    const { uc, paymentGateway, qrStorage, itemImageStorage, restaurantRepo, authAdmin } =
      createUseCase({
        billingRepo: { findByRestaurantId: async () => null },
      });

    const result = await uc.execute(VALID_INPUT);

    expect(result).toEqual({ status: "completed", errors: [] });
    expect(paymentGateway.cancelSubscription).not.toHaveBeenCalled();
    expect(paymentGateway.deleteCustomer).not.toHaveBeenCalled();
    expect(qrStorage.delete).toHaveBeenCalledWith("qr-codes/resto-1.png");
    expect(itemImageStorage.deleteByPrefix).toHaveBeenCalledWith("resto-1/");
    expect(restaurantRepo.delete).toHaveBeenCalledWith("resto-1");
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("cleans only Stripe + item images when no QR asset exists", async () => {
    const { uc, paymentGateway, qrStorage, itemImageStorage, restaurantRepo, authAdmin } =
      createUseCase({
        qrAssetRepo: { findByRestaurantId: async () => null },
      });

    const result = await uc.execute(VALID_INPUT);

    expect(result).toEqual({ status: "completed", errors: [] });
    expect(paymentGateway.cancelSubscription).toHaveBeenCalledWith("sub_xyz789");
    expect(paymentGateway.deleteCustomer).toHaveBeenCalledWith("cus_abc123");
    expect(qrStorage.delete).not.toHaveBeenCalled();
    expect(itemImageStorage.deleteByPrefix).toHaveBeenCalledWith("resto-1/");
    expect(restaurantRepo.delete).toHaveBeenCalledWith("resto-1");
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("still wipes item-images prefix when nothing else to clean (FREE user, no QR)", async () => {
    const { uc, paymentGateway, qrStorage, itemImageStorage, restaurantRepo, authAdmin } =
      createUseCase({
        billingRepo: { findByRestaurantId: async () => null },
        qrAssetRepo: { findByRestaurantId: async () => null },
      });

    const result = await uc.execute(VALID_INPUT);

    expect(result).toEqual({ status: "completed", errors: [] });
    expect(paymentGateway.cancelSubscription).not.toHaveBeenCalled();
    expect(paymentGateway.deleteCustomer).not.toHaveBeenCalled();
    expect(qrStorage.delete).not.toHaveBeenCalled();
    expect(itemImageStorage.deleteByPrefix).toHaveBeenCalledWith("resto-1/");
    expect(restaurantRepo.delete).toHaveBeenCalledWith("resto-1");
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

  it("captures Stripe error and still cleans rest", async () => {
    const { uc, qrStorage, itemImageStorage, restaurantRepo, authAdmin } = createUseCase({
      paymentGateway: {
        cancelSubscription: vi.fn(async () => {
          throw new Error("Stripe API error");
        }),
      },
    });

    const result = await uc.execute(VALID_INPUT);

    expect(result.status).toBe("completed");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Stripe cleanup failed");
    expect(qrStorage.delete).toHaveBeenCalledWith("qr-codes/resto-1.png");
    expect(itemImageStorage.deleteByPrefix).toHaveBeenCalledWith("resto-1/");
    expect(restaurantRepo.delete).toHaveBeenCalledWith("resto-1");
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("captures QR storage error and still cleans rest", async () => {
    const { uc, paymentGateway, itemImageStorage, restaurantRepo, authAdmin } = createUseCase({
      qrStorage: {
        delete: vi.fn(async () => {
          throw new Error("Storage API error");
        }),
      },
    });

    const result = await uc.execute(VALID_INPUT);

    expect(result.status).toBe("completed");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Storage cleanup failed");
    expect(paymentGateway.cancelSubscription).toHaveBeenCalledWith("sub_xyz789");
    expect(paymentGateway.deleteCustomer).toHaveBeenCalledWith("cus_abc123");
    expect(itemImageStorage.deleteByPrefix).toHaveBeenCalledWith("resto-1/");
    expect(restaurantRepo.delete).toHaveBeenCalledWith("resto-1");
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("captures item-images cleanup error and still deletes restaurant + user", async () => {
    const { uc, paymentGateway, qrStorage, restaurantRepo, authAdmin } = createUseCase({
      itemImageStorage: {
        deleteByPrefix: vi.fn(async () => {
          throw new Error("Bucket list failed");
        }),
      },
    });

    const result = await uc.execute(VALID_INPUT);

    expect(result.status).toBe("completed");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Item images cleanup failed");
    expect(paymentGateway.cancelSubscription).toHaveBeenCalledWith("sub_xyz789");
    expect(qrStorage.delete).toHaveBeenCalledWith("qr-codes/resto-1.png");
    expect(restaurantRepo.delete).toHaveBeenCalledWith("resto-1");
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("captures multiple errors and still deletes restaurant + user", async () => {
    const { uc, restaurantRepo, authAdmin } = createUseCase({
      paymentGateway: {
        cancelSubscription: vi.fn(async () => {
          throw new Error("Stripe down");
        }),
      },
      qrStorage: {
        delete: vi.fn(async () => {
          throw new Error("Storage down");
        }),
      },
      itemImageStorage: {
        deleteByPrefix: vi.fn(async () => {
          throw new Error("Bucket down");
        }),
      },
    });

    const result = await uc.execute(VALID_INPUT);

    expect(result.status).toBe("completed");
    expect(result.errors).toHaveLength(3);
    expect(result.errors[0]).toContain("Stripe cleanup failed");
    expect(result.errors[1]).toContain("Storage cleanup failed");
    expect(result.errors[2]).toContain("Item images cleanup failed");
    expect(restaurantRepo.delete).toHaveBeenCalledWith("resto-1");
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-1");
  });
});
