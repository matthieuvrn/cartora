import type { BillingRepository } from "@/application/ports/BillingRepository";
import type {
  InvoiceSummary,
  PaymentGateway,
  SubscriptionPaymentMethod,
} from "@/application/ports/PaymentGateway";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import { PlanPolicy, type PlanTier } from "@/domain/billing/PlanPolicy";
import { SubscriptionChangePolicy, type PaidTier } from "@/domain/billing/SubscriptionChangePolicy";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import { DomainError } from "@/domain/errors/DomainError";

/** Nombre de factures listées sur la page (au-delà : portail Stripe). */
export const INVOICE_HISTORY_LIMIT = 12;

/** Statuts Stripe pour lesquels il n'y a plus rien à gérer — on se rabat sur l'état DB. */
const ENDED_STRIPE_STATUSES = new Set(["canceled", "incomplete_expired"]);

export type GetSubscriptionOverviewInput = {
  restaurantId: string;
};

export type SubscriptionOverview = {
  /** Formule et statut tels que gatés par l'app (DB, miroir des webhooks). */
  tier: PlanTier;
  status: PlanStatus;
  /** Abonnement Stripe vivant — `null` sans billing, ou si Stripe ne le connaît plus. */
  subscription: {
    currentPeriodEndISO: string;
    cancelAtPeriodEnd: boolean;
    /** Rétrogradation programmée (fin de période) vers cette formule, sinon null. */
    scheduledTier: PaidTier | null;
    paymentMethod: SubscriptionPaymentMethod | null;
  } | null;
  invoices: InvoiceSummary[];
  /**
   * Montant à régler aujourd'hui pour passer en PRO — calculé seulement pour un STARTER
   * actif sans changement en attente (le seul cas où l'upgrade est proposé).
   */
  upgradePreview: { targetTier: "PRO"; amountDueCents: number; currency: string } | null;
};

/**
 * Lecture composite de la page Abonnement : état DB (source de vérité du gating) enrichi
 * des détails vivants chez Stripe (échéance, résiliation ou rétrogradation programmée,
 * moyen de paiement, factures, prorata d'upgrade). Aucune écriture, aucun cache :
 * ce que l'utilisateur voit est l'état Stripe au moment du rendu.
 */
export class GetSubscriptionOverview {
  constructor(
    private readonly restaurantRepo: RestaurantRepository,
    private readonly billingRepo: BillingRepository,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async execute(input: GetSubscriptionOverviewInput): Promise<SubscriptionOverview> {
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: input.restaurantId });
    }

    const billing = await this.billingRepo.findByRestaurantId(input.restaurantId);

    const [details, invoices] = await Promise.all([
      billing?.stripeSubscriptionId
        ? this.paymentGateway.getSubscription(billing.stripeSubscriptionId)
        : null,
      billing?.stripeCustomerId
        ? this.paymentGateway.listInvoices({
            stripeCustomerId: billing.stripeCustomerId,
            limit: INVOICE_HISTORY_LIMIT,
          })
        : [],
    ]);

    const live = details && !ENDED_STRIPE_STATUSES.has(details.status) ? details : null;

    const subscription: SubscriptionOverview["subscription"] = live
      ? {
          currentPeriodEndISO: live.currentPeriodEndISO,
          cancelAtPeriodEnd: live.cancelAtPeriodEnd,
          scheduledTier: resolvePaidTier(live.scheduledPriceId),
          paymentMethod: live.paymentMethod,
        }
      : null;

    const canPreviewUpgrade =
      live !== null &&
      restaurant.planTier === "STARTER" &&
      restaurant.planStatus === "ACTIVE" &&
      !live.cancelAtPeriodEnd &&
      subscription?.scheduledTier === null;

    const upgradePreview = canPreviewUpgrade
      ? {
          targetTier: "PRO" as const,
          ...(await this.paymentGateway.previewPlanChange({
            subscriptionId: live.subscriptionId,
            targetTier: "PRO",
          })),
        }
      : null;

    return {
      tier: restaurant.planTier,
      status: restaurant.planStatus,
      subscription,
      invoices,
      upgradePreview,
    };
  }
}

/** Price programmé → formule payante ; un price inconnu (config désynchronisée) vaut « rien ». */
export function resolvePaidTier(priceId: string | null): PaidTier | null {
  if (!priceId) return null;
  const tier = PlanPolicy.resolveTierFromPriceId(priceId);
  return tier !== null && SubscriptionChangePolicy.isPaidTier(tier) ? tier : null;
}
