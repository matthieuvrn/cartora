import Stripe from "stripe";
import type { PaymentGateway, StripeWebhookEvent } from "@/application/ports/PaymentGateway";
import type { PlanTier } from "@/domain/billing/PlanPolicy";

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

type StripeCheckoutSessionLike = {
  customer?: string;
  subscription?: string;
  metadata?: Record<string, string>;
};

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
  }): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: params.stripeCustomerId,
      return_url: params.returnUrl,
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
