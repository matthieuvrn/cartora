import type { PlanTier } from "@/domain/billing/PlanPolicy";
import type { PaidTier } from "@/domain/billing/SubscriptionChangePolicy";

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

/** Moyen de paiement par défaut de l'abonnement — juste de quoi l'identifier à l'écran. */
export type SubscriptionPaymentMethod = {
  /** Réseau carte (`visa`, `mastercard`…) ou type Stripe (`sepa_debit`) pour les non-cartes. */
  brand: string;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
};

/**
 * Photographie de l'abonnement Stripe lue en direct (jamais persistée : la DB ne stocke
 * que les ids). Les dates sont des ISO strings — sérialisables jusqu'aux Client Components.
 */
export type SubscriptionDetails = {
  subscriptionId: string;
  /** Statut Stripe brut (`active`, `past_due`, `canceled`, …) — informatif, pas un gate. */
  status: string;
  priceId: string | null;
  /** Fin de la période en cours = date du prochain renouvellement (ou de fin d'accès). */
  currentPeriodEndISO: string;
  cancelAtPeriodEnd: boolean;
  /** Price programmé par un subscription schedule à la fin de période (rétrogradation), sinon null. */
  scheduledPriceId: string | null;
  paymentMethod: SubscriptionPaymentMethod | null;
};

export type InvoiceStatus = "open" | "paid" | "uncollectible" | "void";

export type InvoiceSummary = {
  id: string;
  /** Numéro lisible (`XXXX-0001`), absent sur certaines factures test. */
  number: string | null;
  createdAtISO: string;
  totalCents: number;
  /** Code ISO minuscule tel que renvoyé par Stripe (`eur`). */
  currency: string;
  status: InvoiceStatus;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
};

export type PlanChangeTiming = "immediate" | "period_end";

export interface PaymentGateway {
  createCheckoutSession(params: {
    restaurantId: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
    /** Tier ciblé : sélectionne le bon STRIPE_PRICE_ID. */
    tier: PlanTier;
  }): Promise<{ url: string }>;
  /**
   * Session du portail Stripe. Sans `flow`, page d'accueil du portail (coordonnées de
   * facturation, historique) ; `payment_method_update` ouvre directement le formulaire
   * de moyen de paiement puis revient sur `returnUrl` — la seule étape qui reste chez
   * Stripe (PCI), tout le reste de la gestion vit dans Cartora.
   */
  createPortalSession(params: {
    stripeCustomerId: string;
    returnUrl: string;
    flow?: "payment_method_update";
  }): Promise<{ url: string }>;
  verifyWebhookSignature(payload: string, signature: string): StripeWebhookEvent;
  /**
   * Récupère le price.id de la subscription donnée. Utilisé en fallback quand le
   * webhook ne porte pas le price (rare, ex: event `invoice.paid` ambigu) ou pour
   * confirmer le tier depuis Stripe en cas de désynchronisation soupçonnée.
   */
  fetchSubscriptionPriceId(subscriptionId: string): Promise<string | null>;
  /**
   * Lecture directe de l'abonnement (page Abonnement). `null` si Stripe ne le connaît
   * plus (purge sandbox, suppression manuelle) — l'appelant se rabat sur l'état DB.
   */
  getSubscription(subscriptionId: string): Promise<SubscriptionDetails | null>;
  /** Dernières factures du customer, plus récentes en premier, brouillons exclus. */
  listInvoices(params: { stripeCustomerId: string; limit: number }): Promise<InvoiceSummary[]>;
  /**
   * Montant qui serait prélevé AUJOURD'HUI pour passer à `targetTier` (prorata de la
   * période en cours, net du crédit de la formule quittée). Aucune écriture.
   */
  previewPlanChange(params: {
    subscriptionId: string;
    targetTier: PaidTier;
  }): Promise<{ amountDueCents: number; currency: string }>;
  /**
   * Change le price de l'abonnement.
   * - `immediate` : prorata facturé et prélevé sur-le-champ ; si le paiement échoue,
   *   RIEN n'est modifié et l'adapter lève `DomainError("payment_failed")`.
   * - `period_end` : programme le nouveau price à la fin de la période en cours
   *   (subscription schedule) — l'accès à la formule payée est conservé jusque-là.
   * La metadata `restaurantId` (contrat des webhooks) est préservée dans les deux cas.
   */
  changeSubscriptionPlan(params: {
    subscriptionId: string;
    targetTier: PaidTier;
    timing: PlanChangeTiming;
  }): Promise<void>;
  /** Annule un changement programmé (`period_end`). No-op s'il n'y en a pas. */
  releaseScheduledPlanChange(subscriptionId: string): Promise<void>;
  /**
   * `cancel: true` ⇒ résiliation à la fin de la période (jamais immédiate — promesse CGU) ;
   * `false` ⇒ reprise, tant que la période court. Un changement programmé est levé au passage.
   */
  setCancelAtPeriodEnd(params: { subscriptionId: string; cancel: boolean }): Promise<void>;
  /**
   * Résiliation IMMÉDIATE (pas fin de période). Contrat : idempotent — une subscription
   * déjà résiliée ou inexistante est un succès silencieux, pas une erreur. Les deux
   * consommateurs (DeleteRestaurant, compensation webhook) peuvent donc réessayer sans risque.
   */
  cancelSubscription(subscriptionId: string): Promise<void>;
  /** Même contrat d'idempotence : un customer déjà supprimé/inexistant est un succès. */
  deleteCustomer(customerId: string): Promise<void>;
}
