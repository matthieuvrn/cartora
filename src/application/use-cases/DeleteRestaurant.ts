import type { BillingRepository } from "@/application/ports/BillingRepository";
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
    private readonly paymentGateway: PaymentGateway,
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

    // 2. Cleanup restaurant logo (non-blocking)
    try {
      await this.logoStorage.deleteByPrefix(`${input.restaurantId}/`);
    } catch (error) {
      errors.push(`Logo cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 3. Delete restaurant (CASCADE handles all child tables)
    await this.restaurantRepo.delete(input.restaurantId);

    // 4. Delete auth user
    await this.authAdmin.deleteUser(input.ownerUserId);

    return { status: "completed", errors };
  }
}
