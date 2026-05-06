"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaBillingRepository } from "@/infrastructure/billing/PrismaBillingRepository";
import { PrismaQrAssetRepository } from "@/infrastructure/qr/PrismaQrAssetRepository";
import { StripePaymentGateway } from "@/infrastructure/stripe/StripePaymentGateway";
import { SupabaseStorageService } from "@/infrastructure/storage/SupabaseStorageService";
import { SupabaseAuthAdminService } from "@/infrastructure/auth/SupabaseAuthAdminService";
import { CreateCheckoutSession } from "@/application/use-cases/CreateCheckoutSession";
import { CreatePortalSession } from "@/application/use-cases/CreatePortalSession";
import { DeleteRestaurant } from "@/application/use-cases/DeleteRestaurant";
import * as Sentry from "@sentry/nextjs";

const TIER_SCHEMA = z.enum(["STARTER", "PRO"]);

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

/**
 * `formData` : champ `tier` requis = "STARTER" | "PRO". L'action accepte FormData
 * (côté client, on l'invoque via <form action={createCheckoutAction}> avec un input
 * caché `tier`). Pour les upgrades Starter↔Pro on passe par `createPortalAction`,
 * pas par cette action — le use case rejette si planStatus n'est pas FREE/CANCELED.
 */
export async function createCheckoutAction(formData: FormData): Promise<void> {
  let checkoutUrl: string;
  try {
    const tier = TIER_SCHEMA.parse(formData.get("tier"));
    const { restaurantId, email } = await getAuthenticatedUser();
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const gateway = new StripePaymentGateway();
    const useCase = new CreateCheckoutSession(restaurantRepo, gateway);
    const result = await useCase.execute({
      restaurantId,
      customerEmail: email,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL!,
      targetTier: tier,
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

export async function deleteAccountAction(): Promise<{ error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true },
    });
    if (!restaurant) throw new Error("No restaurant found");

    const billingRepo = new PrismaBillingRepository(prisma);
    const qrAssetRepo = new PrismaQrAssetRepository(prisma);
    const gateway = new StripePaymentGateway();
    const qrStorage = new SupabaseStorageService("qr-codes");
    const itemImageStorage = new SupabaseStorageService("item-images");
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const authAdmin = new SupabaseAuthAdminService();
    const useCase = new DeleteRestaurant(
      billingRepo,
      qrAssetRepo,
      gateway,
      qrStorage,
      itemImageStorage,
      restaurantRepo,
      authAdmin,
    );

    const result = await useCase.execute({
      restaurantId: restaurant.id,
      ownerUserId: user.id,
    });

    if (result.errors.length > 0) {
      console.error(`[deleteAccount] ${result.errors.length} partial cleanup error(s), see Sentry`);
    }
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "deleteAccount" } });
    return { error: "delete_failed" };
  }

  redirect("/login");
}
