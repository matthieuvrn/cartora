import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/infrastructure/db/prisma";
import { StripePaymentGateway } from "@/infrastructure/stripe/StripePaymentGateway";
import { PrismaBillingRepository } from "@/infrastructure/billing/PrismaBillingRepository";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { HandleStripeWebhook } from "@/application/use-cases/HandleStripeWebhook";

const paymentGateway = new StripePaymentGateway();
const billingRepo = new PrismaBillingRepository(prisma);
const restaurantRepo = new PrismaRestaurantRepository(prisma);
const handleWebhook = new HandleStripeWebhook(billingRepo, restaurantRepo);

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event;
  try {
    event = paymentGateway.verifyWebhookSignature(payload, signature);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const obj = event.data as Record<string, unknown>;
  const metadata = obj.metadata as Record<string, string> | undefined;
  const restaurantId = metadata?.restaurantId;
  const stripeCustomerId = obj.customer as string | undefined;
  const stripeSubscriptionId = (obj.subscription as string) ?? (obj.id as string | undefined);

  if (!restaurantId || !stripeCustomerId || !stripeSubscriptionId) {
    return NextResponse.json({ status: "skipped", reason: "missing required fields" });
  }

  try {
    const result = await handleWebhook.execute({
      eventType: event.type,
      stripeCustomerId,
      stripeSubscriptionId,
      restaurantId,
    });

    if (result.status === "processed") {
      revalidateTag(`public-menu-${result.slug}`, "default");
    }

    return NextResponse.json(result);
  } catch (error) {
    Sentry.captureException(error);
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
