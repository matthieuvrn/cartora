import type { PlanTier } from "@/domain/billing/PlanPolicy";

/**
 * Représentation normalisée d'un event Stripe au sortir de l'adapter. L'adapter pré-extrait
 * les champs utiles (customer / subscription / price / metadata.restaurantId) selon le type
 * d'event, pour que le use case `HandleStripeWebhook` n'ait pas à connaître la structure
 * SDK-spécifique de chaque event.
 *
 * Les champs sont nullable parce que tous ne sont pas dispo sur tous les types d'events :
 * `invoice.paid` n'a pas de `subscription.metadata` direct, `checkout.session.completed`
 * n'a pas de `price.id` lisible directement (il faut passer par les line_items), etc.
 */
export interface StripeWebhookEvent {
  id: string;
  type: string;
  created: number;
  data: Record<string, unknown>;
  /** Stripe Price ID (ex: "price_..."). Utilisé pour mapper price → PlanTier. */
  priceId: string | null;
  /** Stripe Customer ID (ex: "cus_..."). */
  customerId: string | null;
  /** Stripe Subscription ID (ex: "sub_..."). */
  subscriptionId: string | null;
  /**
   * `metadata.restaurantId` de la subscription / session selon le contexte.
   * Renseigné par `createCheckoutSession` à la création.
   */
  restaurantIdMetadata: string | null;
}

export interface PaymentGateway {
  createCheckoutSession(params: {
    restaurantId: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
    /** Tier ciblé : sélectionne le bon STRIPE_PRICE_ID. */
    tier: PlanTier;
  }): Promise<{ url: string }>;
  createPortalSession(params: {
    stripeCustomerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
  verifyWebhookSignature(payload: string, signature: string): StripeWebhookEvent;
  /**
   * Récupère le price.id de la subscription donnée. Utilisé en fallback quand le
   * webhook ne porte pas le price (rare, ex: event `invoice.paid` ambigu) ou pour
   * confirmer le tier depuis Stripe en cas de désynchronisation soupçonnée.
   */
  fetchSubscriptionPriceId(subscriptionId: string): Promise<string | null>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  deleteCustomer(customerId: string): Promise<void>;
}
