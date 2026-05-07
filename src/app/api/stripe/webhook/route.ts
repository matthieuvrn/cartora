import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/infrastructure/db/prisma";
import { StripePaymentGateway } from "@/infrastructure/stripe/StripePaymentGateway";
import { PrismaBillingRepository } from "@/infrastructure/billing/PrismaBillingRepository";
import { PrismaWebhookEventRepository } from "@/infrastructure/billing/PrismaWebhookEventRepository";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { HandleStripeWebhook } from "@/application/use-cases/HandleStripeWebhook";
import { isDomainError } from "@/domain/errors/DomainError";

const paymentGateway = new StripePaymentGateway();
const billingRepo = new PrismaBillingRepository(prisma);
const webhookEventRepo = new PrismaWebhookEventRepository(prisma);
const restaurantRepo = new PrismaRestaurantRepository(prisma);
const handleWebhook = new HandleStripeWebhook(billingRepo, restaurantRepo, webhookEventRepo);

const isDev = () => process.env.NODE_ENV !== "production";

function jsonError(status: number, code: string) {
  return NextResponse.json({ error: code }, { status });
}

/**
 * Webhook Stripe.
 *
 * Convention de retry :
 *  - **400** ⇒ non-retriable. Stripe arrête. À utiliser pour : signature invalide,
 *    champs requis manquants, restaurantId inconnu, payload malformé.
 *  - **200** ⇒ succès, duplicate, ou skipped (transition non applicable, price inconnu, …).
 *  - **500** ⇒ retriable. Stripe retry pendant ~3 jours. Réservé aux pannes
 *    transitoires (DB timeout, Stripe API momentanément indispo).
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
  } catch {
    // Signature falsifiée — ne pas logger en Sentry (potentiel bruit / abus).
    return jsonError(400, "invalid_signature");
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

      if (result.status === "processed") {
        revalidateTag(`public-menu-${result.slug}`, "default");
      }
      return NextResponse.json(result);
    } catch (error) {
      if (isDomainError(error)) {
        // DomainError ⇒ erreur attendue côté domaine (restaurant inconnu, …),
        // non-retriable. 400 + Sentry pour visibilité.
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
