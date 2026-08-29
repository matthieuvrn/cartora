import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/infrastructure/db/prisma";
import {
  StripePaymentGateway,
  isSignatureVerificationError,
} from "@/infrastructure/stripe/StripePaymentGateway";
import { PrismaBillingRepository } from "@/infrastructure/billing/PrismaBillingRepository";
import { PrismaWebhookEventRepository } from "@/infrastructure/billing/PrismaWebhookEventRepository";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { HandleStripeWebhook } from "@/application/use-cases/HandleStripeWebhook";
import { isDomainError } from "@/domain/errors/DomainError";

const paymentGateway = new StripePaymentGateway();
const billingRepo = new PrismaBillingRepository(prisma);
const webhookEventRepo = new PrismaWebhookEventRepository(prisma);
const restaurantRepo = new PrismaRestaurantRepository(prisma);
const handleWebhook = new HandleStripeWebhook(
  billingRepo,
  restaurantRepo,
  webhookEventRepo,
  paymentGateway,
);

const isDev = () => process.env.NODE_ENV !== "production";

function jsonError(status: number, code: string) {
  return NextResponse.json({ error: code }, { status });
}

/**
 * Webhook Stripe.
 *
 * Convention de réponse — ATTENTION à la sémantique réelle de Stripe : Stripe re-livre
 * TOUT non-2xx (backoff exponentiel, ~3 jours), il n'existe PAS de statut « non-retriable ».
 *  - **200** ⇒ acquitté (succès, duplicate, ou skipped : transition non applicable, price
 *    inconnu, restaurant supprimé après compensation). Tout état FINAL connu doit répondre
 *    200, sinon il génère 3 jours de retries + bruit Sentry pour rien.
 *  - **500** ⇒ panne transitoire (DB timeout, Stripe API indispo) : le retry Stripe est
 *    précisément ce qu'on veut.
 *  - **400** ⇒ payload qu'on ne traitera JAMAIS (signature invalide, champs manquants,
 *    restaurantId malformé). Stripe le re-livrera quand même ~3 jours puis abandonnera —
 *    bruit borné et visible dans le dashboard Stripe, c'est voulu (signal de désync).
 *
 * Tous les Sentry captures héritent du scope (event id, type, restaurantId, …).
 */
export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return jsonError(400, "missing_signature");
  }

  let event;
  try {
    event = paymentGateway.verifyWebhookSignature(payload, signature);
  } catch (error) {
    if (isSignatureVerificationError(error)) {
      // Signature falsifiée — ne pas logger en Sentry (potentiel bruit / abus).
      return jsonError(400, "invalid_signature");
    }
    // Tout le reste est une panne/misconfig (ex: STRIPE_WEBHOOK_SECRET absent), pas une
    // attaque : Sentry + 500 retriable — surtout pas un 400 silencieux qui gèlerait la
    // sync billing sans aucun signal.
    Sentry.captureException(error, {
      tags: { handler: "stripeWebhook", phase: "verifySignature" },
    });
    return jsonError(500, "signature_verification_unavailable");
  }

  return Sentry.withScope(async (scope) => {
    scope.setTags({
      handler: "stripeWebhook",
      stripeEventId: event.id,
      stripeEventType: event.type,
    });
    scope.setExtras({
      restaurantId: event.restaurantIdMetadata ?? null,
      stripeCustomerId: event.customerId ?? null,
      stripeSubscriptionId: event.subscriptionId ?? null,
      hasPriceId: Boolean(event.priceId),
    });

    // Récupération du priceId pour `checkout.session.completed` (pas dans le payload).
    let priceId = event.priceId;
    if (!priceId && event.subscriptionId && event.type === "checkout.session.completed") {
      try {
        priceId = await paymentGateway.fetchSubscriptionPriceId(event.subscriptionId);
      } catch (e) {
        // Stripe API momentanément KO ⇒ retriable. Stripe retry, on n'efface rien.
        Sentry.captureException(e, { tags: { phase: "fetchPriceId" } });
        if (isDev()) console.error("[stripe-webhook] fetchPriceId failed", e);
        return jsonError(500, "stripe_api_unavailable");
      }
    }

    const restaurantId = event.restaurantIdMetadata;
    const stripeCustomerId = event.customerId;
    const stripeSubscriptionId = event.subscriptionId;

    if (!restaurantId || !stripeCustomerId || !stripeSubscriptionId) {
      // Avant : 200 silencieux. Maintenant 400 ⇒ visible côté Stripe + Sentry.
      Sentry.captureMessage("stripe_webhook_missing_fields", "warning");
      return jsonError(400, "missing_required_fields");
    }

    if (!z.uuid().safeParse(restaurantId).success) {
      return jsonError(400, "invalid_restaurant_id");
    }

    try {
      const result = await handleWebhook.execute({
        stripeEventId: event.id,
        eventType: event.type,
        stripeCustomerId,
        stripeSubscriptionId,
        restaurantId,
        priceId,
      });

      // Pas de revalidation de cache : la page publique /m/[slug] lit frais depuis la DB à
      // chaque requête (aucun cache par tag), donc un changement d'abonnement (ex. CANCELED
      // → menu indisponible) est reflété immédiatement sans invalidation.
      return NextResponse.json(result);
    } catch (error) {
      if (isDomainError(error)) {
        // DomainError ⇒ état métier qu'on ne traitera jamais (filet de sécurité — le cas
        // restaurant supprimé est désormais compensé + 200 dans le use case). 400 + Sentry.
        Sentry.captureException(error, {
          tags: { phase: "useCase", domainCode: error.code },
          level: "warning",
        });
        if (isDev()) console.error(`[stripe-webhook] domain error ${error.code}`, error);
        return jsonError(400, error.code);
      }
      // Inconnue ⇒ retriable. Stripe retry.
      Sentry.captureException(error, { tags: { phase: "useCase" } });
      if (isDev()) console.error("[stripe-webhook] unknown error", error);
      return jsonError(500, "internal_error");
    }
  });
}
