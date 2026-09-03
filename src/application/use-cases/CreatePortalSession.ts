import type { BillingRepository } from "@/application/ports/BillingRepository";
import type { PaymentGateway } from "@/application/ports/PaymentGateway";
import { DomainError } from "@/domain/errors/DomainError";

export type CreatePortalSessionInput = {
  restaurantId: string;
  baseUrl: string;
  /**
   * `payment_method_update` : deep link vers le formulaire de moyen de paiement (seule étape
   * qui reste chez Stripe), retour direct sur la page Abonnement avec un accusé. Sans flow :
   * accueil du portail (coordonnées de facturation, historique complet).
   */
  flow?: "payment_method_update";
};

export type CreatePortalSessionOutput = {
  portalUrl: string;
};

/** Page de retour du portail — la page Abonnement, quel que soit le flow. */
export const BILLING_PAGE_PATH = "/app/abonnement";

export class CreatePortalSession {
  constructor(
    private readonly billingRepo: BillingRepository,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async execute(input: CreatePortalSessionInput): Promise<CreatePortalSessionOutput> {
    const billing = await this.billingRepo.findByRestaurantId(input.restaurantId);
    if (!billing || !billing.stripeCustomerId) {
      throw new DomainError("billing_missing", { entityId: input.restaurantId });
    }

    const returnUrl =
      input.flow === "payment_method_update"
        ? `${input.baseUrl}${BILLING_PAGE_PATH}?billing=payment_method_updated`
        : `${input.baseUrl}${BILLING_PAGE_PATH}`;

    const { url } = await this.paymentGateway.createPortalSession({
      stripeCustomerId: billing.stripeCustomerId,
      returnUrl,
      flow: input.flow,
    });

    return { portalUrl: url };
  }
}
