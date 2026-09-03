import Stripe from "stripe";
import type {
  InvoiceStatus,
  InvoiceSummary,
  PaymentGateway,
  PlanChangeTiming,
  StripeWebhookEvent,
  SubscriptionDetails,
  SubscriptionPaymentMethod,
} from "@/application/ports/PaymentGateway";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import type { PaidTier } from "@/domain/billing/SubscriptionChangePolicy";
import { DomainError } from "@/domain/errors/DomainError";

/**
 * Sous-ensemble typé du payload Stripe : on ne veut pas dépendre des types Stripe
 * plus loin que ce module. Les noms ci-dessous reflètent ceux du SDK Stripe v22.
 */
type StripeSubscriptionLike = {
  id?: string;
  customer?: string;
  metadata?: Record<string, string>;
  items?: { data?: { price?: { id?: string } }[] };
};

type StripeInvoiceLike = {
  customer?: string;
  subscription?: string;
  parent?: {
    subscription_details?: { subscription?: string; metadata?: Record<string, string> };
  };
  lines?: {
    data?: {
      /** Chemin legacy (< Basil) — conservé en fallback pour d'éventuels replays anciens. */
      price?: { id?: string };
      /** Chemin Basil (stripe@22) : le price id vit sous pricing.price_details.price. */
      pricing?: { price_details?: { price?: string } };
      subscription?: string;
    }[];
  };
};

/** Erreur Stripe « la ressource n'existe pas/plus » — code stable du SDK, pas un message. */
function isResourceMissing(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_missing"
  );
}

/**
 * Vraie signature falsifiée (à distinguer d'une panne/misconfig dans la route webhook :
 * seule la falsification mérite un 400 silencieux — le reste doit être visible et retriable).
 * Exporté ici pour garder la connaissance du SDK dans l'adapter.
 */
export function isSignatureVerificationError(error: unknown): boolean {
  return error instanceof Stripe.errors.StripeSignatureVerificationError;
}

/**
 * Prorata refusé par la banque (HTTP 402 : carte refusée, fonds insuffisants, authentification
 * 3-D Secure requise…). Avec `payment_behavior: error_if_incomplete`, Stripe n'a alors RIEN
 * modifié sur l'abonnement — l'appelant peut le dire sans risque à l'utilisateur.
 */
function isPaymentFailure(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeCardError ||
    (error instanceof Stripe.errors.StripeError && error.statusCode === 402)
  );
}

/** Schedules encore pilotables — `completed`/`canceled`/`released` sont inertes. */
function isLiveSchedule(schedule: Stripe.SubscriptionSchedule): boolean {
  return schedule.status === "active" || schedule.status === "not_started";
}

/** Id d'une référence Stripe, expandée ou non (tout objet Stripe porte un `id` string). */
function idOf(ref: string | { id?: unknown } | null | undefined): string | null {
  if (!ref) return null;
  if (typeof ref === "string") return ref;
  return typeof ref.id === "string" ? ref.id : null;
}

function unixToISO(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

function requireItem(sub: Stripe.Subscription): Stripe.SubscriptionItem {
  const item = sub.items.data[0];
  if (!item) throw new Error(`Subscription ${sub.id} has no item`);
  return item;
}

function toPaymentMethod(
  pm: string | Stripe.PaymentMethod | null | undefined,
): SubscriptionPaymentMethod | null {
  if (!pm || typeof pm === "string") return null;
  if (pm.card) {
    return {
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
    };
  }
  if (pm.sepa_debit) {
    return {
      brand: "sepa_debit",
      last4: pm.sepa_debit.last4 ?? null,
      expMonth: null,
      expYear: null,
    };
  }
  return { brand: pm.type, last4: null, expMonth: null, expYear: null };
}

/**
 * Moyen de paiement par défaut du customer. Fallback indispensable : le flow
 * `payment_method_update` du portail pose la nouvelle carte sur le customer ET vide
 * `default_payment_method` de la subscription (vérifié en sandbox le 2026-09-03).
 */
function customerDefaultPaymentMethod(
  customer: Stripe.Subscription["customer"],
): string | Stripe.PaymentMethod | null {
  if (typeof customer === "string" || customer.deleted) return null;
  return customer.invoice_settings?.default_payment_method ?? null;
}

/**
 * Price de la phase qui suit la phase courante d'un schedule vivant — c'est la rétrogradation
 * programmée par `changeSubscriptionPlan(period_end)`. `null` si rien n'est programmé ou si
 * la phase suivante garde le même price.
 */
function scheduledPriceId(sub: Stripe.Subscription, currentPriceId: string | null): string | null {
  const schedule = sub.schedule;
  if (!schedule || typeof schedule === "string" || !isLiveSchedule(schedule)) return null;
  const current = schedule.current_phase;
  if (!current) return null;
  const next = schedule.phases.find((phase) => phase.start_date === current.end_date);
  const price = idOf(next?.items[0]?.price);
  return price && price !== currentPriceId ? price : null;
}

function toInvoiceStatus(status: Stripe.Invoice.Status | null): InvoiceStatus | null {
  switch (status) {
    case "open":
    case "paid":
    case "uncollectible":
    case "void":
      return status;
    default:
      return null;
  }
}

type PhaseDiscountParam = Stripe.SubscriptionScheduleUpdateParams.Phase.Discount;

/**
 * Remises d'une phase (code promo saisi au Checkout) re-déclarées telles quelles : une mise à
 * jour de schedule REMPLACE les phases, Stripe efface tout paramètre omis.
 */
function toDiscountParams(
  discounts: Stripe.SubscriptionSchedule.Phase.Discount[],
): PhaseDiscountParam[] | undefined {
  const params = discounts.flatMap((d): PhaseDiscountParam[] => {
    const promotionCode = idOf(d.promotion_code);
    if (promotionCode) return [{ promotion_code: promotionCode }];
    const coupon = idOf(d.coupon);
    if (coupon) return [{ coupon }];
    // `d.discount` n'est jamais expandé ici (id `di_…`) — et le SDK le type par erreur avec
    // l'interface imbriquée `Phase.Discount` (shadowing), d'où le test sur `string` plutôt qu'`idOf`.
    const discount = typeof d.discount === "string" ? d.discount : null;
    return discount ? [{ discount }] : [];
  });
  return params.length > 0 ? params : undefined;
}

type StripeCheckoutSessionLike = {
  customer?: string;
  subscription?: string;
  metadata?: Record<string, string>;
};

/** Expansions communes aux lectures d'abonnement de la page Abonnement. */
const SUBSCRIPTION_EXPAND = [
  "default_payment_method",
  "schedule",
  "customer.invoice_settings.default_payment_method",
];

export class StripePaymentGateway implements PaymentGateway {
  // Client lazy : la clé n'est lue qu'au premier appel Stripe effectif. Une clé absente
  // ne doit pas faire échouer les flux qui n'ont rien à faire côté Stripe (ex. suppression
  // d'un compte FREE sans billing — le droit à l'effacement ne dépend pas de la config billing).
  private stripeClient: Stripe | null = null;
  private readonly webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  private get stripe(): Stripe {
    if (!this.stripeClient) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
      this.stripeClient = new Stripe(key);
    }
    return this.stripeClient;
  }

  private priceIdFor(tier: PlanTier): string {
    if (tier === "STARTER") {
      const id = process.env.STRIPE_PRICE_ID_STARTER;
      if (!id) throw new Error("STRIPE_PRICE_ID_STARTER not configured");
      return id;
    }
    if (tier === "PRO") {
      const id = process.env.STRIPE_PRICE_ID;
      if (!id) throw new Error("STRIPE_PRICE_ID not configured");
      return id;
    }
    throw new Error(`Cannot create checkout for tier ${tier}`);
  }

  async createCheckoutSession(params: {
    restaurantId: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
    tier: PlanTier;
  }): Promise<{ url: string }> {
    const priceId = this.priceIdFor(params.tier);

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: params.customerEmail,
      // metadata sur la session ET sur la subscription pour que tous les webhooks
      // (checkout.session.completed ET customer.subscription.*) portent restaurantId.
      metadata: { restaurantId: params.restaurantId, tier: params.tier },
      subscription_data: {
        metadata: { restaurantId: params.restaurantId, tier: params.tier },
      },
      // NB: automatic_tax + tax_id_collection seront ajoutés à l'étape 6
      //     (passage en Live + activation Stripe Tax). Pas en Test.
      allow_promotion_codes: true,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    if (!session.url) {
      throw new Error("Stripe returned no checkout URL");
    }

    return { url: session.url };
  }

  async createPortalSession(params: {
    stripeCustomerId: string;
    returnUrl: string;
    flow?: "payment_method_update";
  }): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: params.stripeCustomerId,
      return_url: params.returnUrl,
      // Deep link : formulaire de moyen de paiement puis retour direct chez Cartora (pas
      // d'escale sur l'accueil du portail).
      flow_data:
        params.flow === "payment_method_update"
          ? {
              type: "payment_method_update",
              after_completion: { type: "redirect", redirect: { return_url: params.returnUrl } },
            }
          : undefined,
    });

    return { url: session.url };
  }

  verifyWebhookSignature(payload: string, signature: string): StripeWebhookEvent {
    // API STATIQUE, sans clé : la vérification n'a besoin que du webhook secret. Ne PAS
    // passer par le getter lazy — une STRIPE_SECRET_KEY absente se déguiserait en
    // « signature invalide » (400 silencieux) et gèlerait toute la sync billing sans signal.
    const event = Stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    return this.normalizeEvent(event);
  }

  async fetchSubscriptionPriceId(subscriptionId: string): Promise<string | null> {
    const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
    const priceId = sub.items.data[0]?.price.id;
    return priceId ?? null;
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionDetails | null> {
    let sub: Stripe.Subscription;
    try {
      sub = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: SUBSCRIPTION_EXPAND,
      });
    } catch (error) {
      if (isResourceMissing(error)) return null;
      throw error;
    }

    const item = sub.items.data[0];
    const priceId = item?.price.id ?? null;
    return {
      subscriptionId: sub.id,
      status: sub.status,
      priceId,
      // Stripe v22 (Basil) : la période courante vit sur l'item, plus sur la subscription.
      currentPeriodEndISO: unixToISO(item?.current_period_end ?? sub.billing_cycle_anchor),
      // `cancel_at` couvre aussi une date de fin posée depuis le dashboard.
      cancelAtPeriodEnd: sub.cancel_at_period_end || sub.cancel_at !== null,
      scheduledPriceId: scheduledPriceId(sub, priceId),
      paymentMethod:
        toPaymentMethod(sub.default_payment_method) ??
        toPaymentMethod(customerDefaultPaymentMethod(sub.customer)),
    };
  }

  async listInvoices(params: {
    stripeCustomerId: string;
    limit: number;
  }): Promise<InvoiceSummary[]> {
    const page = await this.stripe.invoices.list({
      customer: params.stripeCustomerId,
      limit: params.limit,
    });
    return page.data.flatMap((invoice): InvoiceSummary[] => {
      const status = toInvoiceStatus(invoice.status);
      if (!status) return []; // brouillons : jamais montrés au client
      return [
        {
          id: invoice.id,
          number: invoice.number,
          createdAtISO: unixToISO(invoice.created),
          totalCents: invoice.total,
          currency: invoice.currency,
          status,
          hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
          pdfUrl: invoice.invoice_pdf ?? null,
        },
      ];
    });
  }

  async previewPlanChange(params: {
    subscriptionId: string;
    targetTier: PaidTier;
  }): Promise<{ amountDueCents: number; currency: string }> {
    const sub = await this.stripe.subscriptions.retrieve(params.subscriptionId);
    const item = requireItem(sub);
    const preview = await this.stripe.invoices.createPreview({
      subscription: params.subscriptionId,
      subscription_details: {
        items: [{ id: item.id, price: this.priceIdFor(params.targetTier), quantity: 1 }],
        proration_behavior: "always_invoice",
      },
    });
    // Seules les lignes de prorata sont dues maintenant (l'aperçu peut aussi porter le
    // renouvellement à venir) ; les remises éventuelles sont déduites ligne à ligne.
    const amountDueCents = preview.lines.data
      .filter((line) => line.parent?.subscription_item_details?.proration === true)
      .reduce((sum, line) => {
        const discounts = (line.discount_amounts ?? []).reduce((acc, d) => acc + d.amount, 0);
        return sum + line.amount - discounts;
      }, 0);
    return { amountDueCents: Math.max(amountDueCents, 0), currency: preview.currency };
  }

  async changeSubscriptionPlan(params: {
    subscriptionId: string;
    targetTier: PaidTier;
    timing: PlanChangeTiming;
  }): Promise<void> {
    const newPriceId = this.priceIdFor(params.targetTier);
    const sub = await this.stripe.subscriptions.retrieve(params.subscriptionId, {
      expand: ["schedule"],
    });
    const item = requireItem(sub);
    // `restaurantId` DOIT survivre au changement : c'est la clé de routage des webhooks
    // (`customer.subscription.updated` sans elle serait rejeté et le tier jamais synchronisé).
    const metadata = { ...sub.metadata, tier: params.targetTier };

    if (params.timing === "immediate") {
      await this.releaseScheduleOf(sub);
      try {
        await this.stripe.subscriptions.update(params.subscriptionId, {
          items: [{ id: item.id, price: newPriceId, quantity: 1 }],
          proration_behavior: "always_invoice",
          // Paiement du prorata refusé ⇒ Stripe rejette TOUTE la mise à jour (rien de modifié).
          payment_behavior: "error_if_incomplete",
          metadata,
        });
      } catch (error) {
        if (isPaymentFailure(error)) throw new DomainError("payment_failed");
        throw error;
      }
      return;
    }

    // Fin de période : schedule à deux phases — la période payée telle quelle, puis un mois
    // au nouveau price, après quoi la subscription est relâchée (`release`) et continue seule.
    const schedule = await this.attachSchedule(sub);
    const currentPhase =
      schedule.phases.find((phase) => phase.start_date === schedule.current_phase?.start_date) ??
      schedule.phases[0];
    if (!currentPhase) throw new Error(`Schedule ${schedule.id} has no phase`);
    const discounts = toDiscountParams(currentPhase.discounts);

    await this.stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: "release",
      phases: [
        {
          items: currentPhase.items.map((phaseItem) => ({
            price: idOf(phaseItem.price) ?? undefined,
            quantity: phaseItem.quantity ?? 1,
          })),
          start_date: currentPhase.start_date,
          end_date: currentPhase.end_date,
          discounts,
          metadata: sub.metadata,
        },
        {
          items: [{ price: newPriceId, quantity: 1 }],
          duration: { interval: "month", interval_count: 1 },
          discounts,
          metadata,
        },
      ],
    });
  }

  async releaseScheduledPlanChange(subscriptionId: string): Promise<void> {
    let sub: Stripe.Subscription;
    try {
      sub = await this.stripe.subscriptions.retrieve(subscriptionId, { expand: ["schedule"] });
    } catch (error) {
      if (isResourceMissing(error)) return;
      throw error;
    }
    await this.releaseScheduleOf(sub);
  }

  async setCancelAtPeriodEnd(params: { subscriptionId: string; cancel: boolean }): Promise<void> {
    if (params.cancel) {
      // Une subscription pilotée par un schedule refuse `cancel_at_period_end` : on lève
      // d'abord l'éventuelle rétrogradation programmée (la résiliation l'emporte).
      const sub = await this.stripe.subscriptions.retrieve(params.subscriptionId, {
        expand: ["schedule"],
      });
      await this.releaseScheduleOf(sub);
    }
    await this.stripe.subscriptions.update(params.subscriptionId, {
      cancel_at_period_end: params.cancel,
    });
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    let status: string;
    try {
      status = (await this.stripe.subscriptions.retrieve(subscriptionId)).status;
    } catch (error) {
      if (isResourceMissing(error)) return;
      throw error;
    }
    if (status === "canceled" || status === "incomplete_expired") return;
    try {
      await this.stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      if (isResourceMissing(error)) return;
      throw error;
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      await this.stripe.customers.del(customerId);
    } catch (error) {
      if (isResourceMissing(error)) return;
      throw error;
    }
  }

  /** Schedule vivant attaché à la subscription, sinon un nouveau créé à partir d'elle. */
  private async attachSchedule(sub: Stripe.Subscription): Promise<Stripe.SubscriptionSchedule> {
    const existing = sub.schedule;
    if (existing && typeof existing !== "string" && isLiveSchedule(existing)) return existing;
    if (typeof existing === "string") {
      const fetched = await this.stripe.subscriptionSchedules.retrieve(existing);
      if (isLiveSchedule(fetched)) return fetched;
    }
    return this.stripe.subscriptionSchedules.create({ from_subscription: sub.id });
  }

  /**
   * Relâche le schedule vivant de la subscription (elle continue telle quelle, sans les
   * phases restantes). Attend une subscription lue avec `expand: ["schedule"]` — un schedule
   * non expandé n'est pas inspectable et est laissé tel quel.
   */
  private async releaseScheduleOf(sub: Stripe.Subscription): Promise<void> {
    const schedule = sub.schedule;
    if (!schedule || typeof schedule === "string" || !isLiveSchedule(schedule)) return;
    try {
      await this.stripe.subscriptionSchedules.release(schedule.id);
    } catch (error) {
      if (isResourceMissing(error)) return;
      throw error;
    }
  }

  /**
   * Normalise un Stripe.Event vers notre `StripeWebhookEvent` neutre. Selon le `event.type`,
   * `event.data.object` est typé différemment par Stripe — on extrait les champs pertinents
   * de chaque cas et on retourne `null` quand non applicable.
   */
  private normalizeEvent(event: Stripe.Event): StripeWebhookEvent {
    const obj = event.data.object as unknown as Record<string, unknown>;
    const out: StripeWebhookEvent = {
      id: event.id,
      type: event.type,
      created: event.created,
      data: obj,
      priceId: null,
      customerId: null,
      subscriptionId: null,
      restaurantIdMetadata: null,
    };

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = obj as StripeSubscriptionLike;
      out.subscriptionId = sub.id ?? null;
      out.customerId = typeof sub.customer === "string" ? sub.customer : null;
      out.priceId = sub.items?.data?.[0]?.price?.id ?? null;
      out.restaurantIdMetadata = sub.metadata?.restaurantId ?? null;
      return out;
    }

    if (event.type === "checkout.session.completed") {
      const session = obj as StripeCheckoutSessionLike;
      out.customerId = typeof session.customer === "string" ? session.customer : null;
      out.subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
      out.restaurantIdMetadata = session.metadata?.restaurantId ?? null;
      // priceId n'est pas directement sur la session — on laisse null. Le use case
      // appellera fetchSubscriptionPriceId si besoin.
      return out;
    }

    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = obj as StripeInvoiceLike;
      out.customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      // Stripe v22+ (Basil) : la metadata de la subscription est recopiée sur l'invoice
      // sous `parent.subscription_details.metadata`. Sans cette extraction, la route
      // rejette TOUS les events invoice (champ requis manquant) et PAST_DUE devient
      // inatteignable — les impayés passeraient inaperçus.
      out.restaurantIdMetadata =
        invoice.parent?.subscription_details?.metadata?.restaurantId ?? null;
      // Stripe v22+ : sur les invoices, la subscription est sous `parent.subscription_details.subscription`
      // ou sur chaque line_item (`lines.data[i].subscription`). On essaie plusieurs paths.
      out.subscriptionId =
        (typeof invoice.subscription === "string" ? invoice.subscription : null) ??
        invoice.parent?.subscription_details?.subscription ??
        invoice.lines?.data?.[0]?.subscription ??
        null;
      out.priceId =
        invoice.lines?.data?.[0]?.pricing?.price_details?.price ??
        invoice.lines?.data?.[0]?.price?.id ??
        null;
      return out;
    }

    return out;
  }
}
