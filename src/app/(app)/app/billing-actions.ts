"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaBillingRepository } from "@/infrastructure/billing/PrismaBillingRepository";
import { StripePaymentGateway } from "@/infrastructure/stripe/StripePaymentGateway";
import { CreateCheckoutSession } from "@/application/use-cases/CreateCheckoutSession";
import { CreatePortalSession } from "@/application/use-cases/CreatePortalSession";
import * as Sentry from "@sentry/nextjs";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getAuthenticatedUser(): Promise<{ restaurantId: string; email: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not authenticated");

  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true },
  });
  if (!restaurant) throw new Error("No restaurant found");

  return { restaurantId: restaurant.id, email: user.email };
}

async function getAuthenticatedRestaurantId(): Promise<string> {
  const { restaurantId } = await getAuthenticatedUser();
  return restaurantId;
}

// ─── Actions ────────────────────────────────────────────────────────────────

export async function createCheckoutAction(): Promise<void> {
  let checkoutUrl: string;
  try {
    const { restaurantId, email } = await getAuthenticatedUser();
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const gateway = new StripePaymentGateway();
    const useCase = new CreateCheckoutSession(restaurantRepo, gateway);
    const result = await useCase.execute({
      restaurantId,
      customerEmail: email,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL!,
    });
    checkoutUrl = result.checkoutUrl;
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "createCheckout" } });
    throw e;
  }
  redirect(checkoutUrl);
}

export async function createPortalAction(): Promise<void> {
  let portalUrl: string;
  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const billingRepo = new PrismaBillingRepository(prisma);
    const gateway = new StripePaymentGateway();
    const useCase = new CreatePortalSession(billingRepo, gateway);
    const result = await useCase.execute({
      restaurantId,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL!,
    });
    portalUrl = result.portalUrl;
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "createPortal" } });
    throw e;
  }
  redirect(portalUrl);
}
