import type { BillingRepository } from "@/application/ports/BillingRepository";
import type { QrAssetRepository } from "@/application/ports/QrAssetRepository";
import type { PaymentGateway } from "@/application/ports/PaymentGateway";
import type { StorageService } from "@/application/ports/StorageService";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { AuthAdminService } from "@/application/ports/AuthAdminService";

type Input = {
  restaurantId: string;
  ownerUserId: string;
};

type Output = {
  status: "completed";
  errors: string[];
};

export class DeleteRestaurant {
  constructor(
    private readonly billingRepo: BillingRepository,
    private readonly qrAssetRepo: QrAssetRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly qrStorage: StorageService,
    private readonly itemImageStorage: StorageService,
    private readonly logoStorage: StorageService,
    private readonly restaurantRepo: RestaurantRepository,
    private readonly authAdmin: AuthAdminService,
  ) {}

  async execute(input: Input): Promise<Output> {
    const errors: string[] = [];

    // 1. Cleanup Stripe (non-blocking)
    try {
      const billing = await this.billingRepo.findByRestaurantId(input.restaurantId);
      if (billing) {
        if (billing.stripeSubscriptionId) {
          await this.paymentGateway.cancelSubscription(billing.stripeSubscriptionId);
        }
        if (billing.stripeCustomerId) {
          await this.paymentGateway.deleteCustomer(billing.stripeCustomerId);
        }
      }
    } catch (error) {
      errors.push(
        `Stripe cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // 2. Cleanup QR storage (non-blocking)
    try {
      const qrAsset = await this.qrAssetRepo.findByRestaurantId(input.restaurantId);
      if (qrAsset) {
        await this.qrStorage.delete(qrAsset.storagePath);
      }
    } catch (error) {
      errors.push(
        `Storage cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // 3. Cleanup item images (non-blocking)
    try {
      await this.itemImageStorage.deleteByPrefix(`${input.restaurantId}/`);
    } catch (error) {
      errors.push(
        `Item images cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // 4. Cleanup restaurant logo (non-blocking)
    try {
      await this.logoStorage.deleteByPrefix(`${input.restaurantId}/`);
    } catch (error) {
      errors.push(`Logo cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 5. Delete restaurant (CASCADE handles all child tables)
    await this.restaurantRepo.delete(input.restaurantId);

    // 6. Delete auth user
    await this.authAdmin.deleteUser(input.ownerUserId);

    return { status: "completed", errors };
  }
}
