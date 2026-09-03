"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaBillingRepository } from "@/infrastructure/billing/PrismaBillingRepository";
import { StripePaymentGateway } from "@/infrastructure/stripe/StripePaymentGateway";
import { SupabaseStorageService } from "@/infrastructure/storage/SupabaseStorageService";
import { SupabaseAuthAdminService } from "@/infrastructure/auth/SupabaseAuthAdminService";
import { CreateCheckoutSession } from "@/application/use-cases/CreateCheckoutSession";
import {
  BILLING_PAGE_PATH,
  CreatePortalSession,
} from "@/application/use-cases/CreatePortalSession";
import {
  ChangeSubscriptionPlan,
  type ChangeSubscriptionPlanOutput,
} from "@/application/use-cases/ChangeSubscriptionPlan";
import { UpdateSubscriptionCancellation } from "@/application/use-cases/UpdateSubscriptionCancellation";
import { DeleteRestaurant } from "@/application/use-cases/DeleteRestaurant";
import * as Sentry from "@sentry/nextjs";
import { isDomainError } from "@/domain/errors/DomainError";
import { withActionContext, type ActionState } from "@/lib/action-result";

const TIER_SCHEMA = z.enum(["STARTER", "PRO"]);

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getAuthenticatedUser(): Promise<{ restaurantId: string; email: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    // Session expirée → `redirect()` propage NEXT_REDIRECT, pas de Sentry noise.
    redirect("/login");
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true },
  });
  if (!restaurant) redirect("/app");

  return { restaurantId: restaurant.id, email: user.email };
}

async function getAuthenticatedRestaurantId(): Promise<string> {
  const { restaurantId } = await getAuthenticatedUser();
  return restaurantId;
}

/**
 * Échec d'un flux « hand-off Stripe » (Checkout / portail) : retour sur la page Abonnement
 * avec un code lisible, affiché en toast par `BillingUrlFeedback`.
 */
function redirectWithBillingError(code: string): never {
  redirect(`${BILLING_PAGE_PATH}?billing_error=${encodeURIComponent(code)}`);
}

// ─── Hand-offs Stripe (redirect) ────────────────────────────────────────────

/**
 * `formData` : champ `tier` requis = "STARTER" | "PRO". Invoquée via <form action> avec un
 * input caché `tier` (PricingTiers). Première souscription ou ré-abonnement uniquement —
 * un abonné actif change de formule via `changePlanAction` (le use case rejette
 * `use_portal_to_change_plan` sinon, et le toast renvoie vers la page Abonnement).
 */
export async function createCheckoutAction(formData: FormData): Promise<void> {
  // Auth HORS du try : ses `redirect()` (NEXT_REDIRECT) ne doivent pas être avalés/capturés.
  const auth = await getAuthenticatedUser();
  let checkoutUrl: string;
  try {
    const tier = TIER_SCHEMA.parse(formData.get("tier"));
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const gateway = new StripePaymentGateway();
    const useCase = new CreateCheckoutSession(restaurantRepo, gateway);
    const result = await useCase.execute({
      restaurantId: auth.restaurantId,
      customerEmail: auth.email,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL!,
      targetTier: tier,
    });
    checkoutUrl = result.checkoutUrl;
  } catch (e) {
    unstable_rethrow(e);
    if (isDomainError(e)) {
      Sentry.captureException(e, {
        tags: { action: "createCheckout", domainCode: e.code },
        user: { id: auth.restaurantId },
        level: "warning",
      });
      redirectWithBillingError(e.code);
    }
    Sentry.captureException(e, {
      tags: { action: "createCheckout" },
      user: { id: auth.restaurantId },
    });
    throw e;
  }
  redirect(checkoutUrl);
}

async function startPortalSession(
  actionName: "createPortal" | "updatePaymentMethod",
  flow?: "payment_method_update",
): Promise<void> {
  const restaurantId = await getAuthenticatedRestaurantId();
  let portalUrl: string;
  try {
    const billingRepo = new PrismaBillingRepository(prisma);
    const gateway = new StripePaymentGateway();
    const useCase = new CreatePortalSession(billingRepo, gateway);
    const result = await useCase.execute({
      restaurantId,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL!,
      flow,
    });
    portalUrl = result.portalUrl;
  } catch (e) {
    unstable_rethrow(e);
    if (isDomainError(e)) {
      Sentry.captureException(e, {
        tags: { action: actionName, domainCode: e.code },
        user: { id: restaurantId },
        level: "warning",
      });
      redirectWithBillingError(e.code);
    }
    Sentry.captureException(e, { tags: { action: actionName }, user: { id: restaurantId } });
    throw e;
  }
  redirect(portalUrl);
}

/** Accueil du portail Stripe : coordonnées de facturation + historique complet. */
export async function createPortalAction(): Promise<void> {
  await startPortalSession("createPortal");
}

/** Deep link « moyen de paiement » du portail, retour direct sur la page Abonnement. */
export async function updatePaymentMethodAction(): Promise<void> {
  await startPortalSession("updatePaymentMethod", "payment_method_update");
}

// ─── Gestion in-app de l'abonnement (ActionState + toasts) ──────────────────

export type PlanChangeActionState = ActionState<{
  kind?: ChangeSubscriptionPlanOutput["kind"];
  effectiveAtISO?: string | null;
}>;

/**
 * Changement de formule STARTER ↔ PRO (ou levée d'une rétrogradation programmée en
 * re-choisissant la formule courante). Le tier gate tout le shell (PublishBar, sections
 * verrouillées) : l'arbre `(app)` entier est revalidé.
 */
export async function changePlanAction(input: { tier: string }): Promise<PlanChangeActionState> {
  const parsed = TIER_SCHEMA.safeParse(input.tier);
  if (!parsed.success) return { error: { code: "validation" } };

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext(
    { actionName: "changePlan", restaurantId, input: { tier: parsed.data } },
    async () => {
      const useCase = new ChangeSubscriptionPlan(
        new PrismaRestaurantRepository(prisma),
        new PrismaBillingRepository(prisma),
        new StripePaymentGateway(),
      );
      const result = await useCase.execute({ restaurantId, targetTier: parsed.data });
      revalidatePath("/app", "layout");
      return { error: null, kind: result.kind, effectiveAtISO: result.effectiveAtISO };
    },
  );
}

export type CancellationActionState = ActionState<{
  cancelAtPeriodEnd?: boolean;
  currentPeriodEndISO?: string;
}>;

async function setCancellation(
  actionName: "cancelSubscription" | "resumeSubscription",
  cancel: boolean,
): Promise<CancellationActionState> {
  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext({ actionName, restaurantId }, async () => {
    const useCase = new UpdateSubscriptionCancellation(
      new PrismaRestaurantRepository(prisma),
      new PrismaBillingRepository(prisma),
      new StripePaymentGateway(),
    );
    const result = await useCase.execute({ restaurantId, cancel });
    revalidatePath(BILLING_PAGE_PATH);
    return { error: null, ...result };
  });
}

/** Résiliation à la fin de la période en cours (jamais immédiate — promesse CGU). */
export async function cancelSubscriptionAction(): Promise<CancellationActionState> {
  return setCancellation("cancelSubscription", true);
}

/** Reprise d'un abonnement dont la résiliation est programmée (tant que la période court). */
export async function resumeSubscriptionAction(): Promise<CancellationActionState> {
  return setCancellation("resumeSubscription", false);
}

// ─── Suppression de compte ──────────────────────────────────────────────────

export async function deleteAccountAction(): Promise<{ error: string | null }> {
  // Auth résolue HORS du try : les `redirect()` lancent NEXT_REDIRECT et ne doivent
  // pas être avalés par le catch (même convention que withActionContext).
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true },
  });
  if (!restaurant) redirect("/app");

  try {
    const billingRepo = new PrismaBillingRepository(prisma);
    const gateway = new StripePaymentGateway();
    const logoStorage = new SupabaseStorageService("restaurant-logos");
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const authAdmin = new SupabaseAuthAdminService();
    const useCase = new DeleteRestaurant(
      billingRepo,
      gateway,
      logoStorage,
      restaurantRepo,
      authAdmin,
    );

    const result = await useCase.execute({
      restaurantId: restaurant.id,
      ownerUserId: user.id,
    });

    if (result.errors.length > 0) {
      console.error(`[deleteAccount] ${result.errors.length} partial cleanup error(s), see Sentry`);
      // restaurantId + ownerUserId sont indispensables ici : les lignes DB sont déjà
      // cascadées, cet event Sentry est la SEULE clé de pivot pour le nettoyage manuel
      // (ex: `supabase auth admin delete-user <ownerUserId>` si deleteUser a échoué).
      Sentry.captureMessage("deleteAccount.partialCleanup", {
        level: "warning",
        tags: { action: "deleteAccount" },
        extra: {
          errorCount: result.errors.length,
          errors: result.errors,
          restaurantId: restaurant.id,
          ownerUserId: user.id,
        },
      });
    }
  } catch (e) {
    unstable_rethrow(e);
    if (isDomainError(e) && e.code === "stripe_cleanup_failed") {
      // Résiliation Stripe impossible ⇒ RIEN n'a été supprimé (invariant DeleteRestaurant).
      // L'UI affiche un message dédié « réessayez » — le retry converge (appels idempotents).
      Sentry.captureException(e, {
        tags: { action: "deleteAccount", domainCode: e.code },
        extra: { restaurantId: restaurant.id, ownerUserId: user.id },
        level: "warning",
      });
      return { error: "stripe_cleanup_failed" };
    }
    Sentry.captureException(e, {
      tags: { action: "deleteAccount" },
      extra: { restaurantId: restaurant.id, ownerUserId: user.id },
    });
    return { error: "delete_failed" };
  }

  // signOut même en cas d'échec non-fatal de deleteUser : sinon la session resterait
  // valide et le proxy renverrait /login → /app, où EnsureRestaurantExists
  // recréerait silencieusement un restaurant vierge.
  await supabase.auth.signOut();
  redirect("/login");
}
