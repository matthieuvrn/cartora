import type { BillingRepository } from "@/application/ports/BillingRepository";
import type { PaymentGateway } from "@/application/ports/PaymentGateway";

export type CreatePortalSessionInput = {
  restaurantId: string;
  baseUrl: string;
};

export type CreatePortalSessionOutput = {
  portalUrl: string;
};

export class CreatePortalSession {
  constructor(
    private readonly billingRepo: BillingRepository,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async execute(input: CreatePortalSessionInput): Promise<CreatePortalSessionOutput> {
    const billing = await this.billingRepo.findByRestaurantId(input.restaurantId);
    if (!billing || !billing.stripeCustomerId) {
      throw new Error("Aucune information de facturation trouvée");
    }

    const { url } = await this.paymentGateway.createPortalSession({
      stripeCustomerId: billing.stripeCustomerId,
      returnUrl: input.baseUrl + "/app",
    });

    return { portalUrl: url };
  }
}
