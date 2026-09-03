import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { requireRestaurant } from "../_lib/requireRestaurant";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaBillingRepository } from "@/infrastructure/billing/PrismaBillingRepository";
import { StripePaymentGateway } from "@/infrastructure/stripe/StripePaymentGateway";
import {
  GetSubscriptionOverview,
  type SubscriptionOverview,
} from "@/application/use-cases/GetSubscriptionOverview";
import { isDomainError } from "@/domain/errors/DomainError";
import { SubscriptionPageBody } from "@/interface/ui/components/billing/SubscriptionPageBody";

// Section « Abonnement » : la gestion de l'abonnement vit ICI, pas sur le portail Stripe —
// formule et état, changement de formule (upgrade immédiat / rétrogradation fin de période),
// résiliation et reprise, moyen de paiement, factures. Stripe n'est plus qu'une escale pour ce
// qui l'exige (Checkout de première souscription, saisie de carte, coordonnées de facturation).
// Lecture Stripe à chaque rendu, sans cache : l'état affiché est l'état vivant. La composition
// visuelle vit dans `SubscriptionPageBody` (interface) — cette page ne fait que charger.
export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ billing_error?: string; billing?: string }>;
}) {
  const { restaurantId } = await requireRestaurant();
  const { billing_error: billingError, billing: billingNotice } = await searchParams;

  const restaurantRepo = new PrismaRestaurantRepository(prisma);
  const billingRepo = new PrismaBillingRepository(prisma);

  let overview: SubscriptionOverview;
  let stripeUnavailable = false;
  try {
    overview = await new GetSubscriptionOverview(
      restaurantRepo,
      billingRepo,
      new StripePaymentGateway(),
    ).execute({ restaurantId });
  } catch (e) {
    if (isDomainError(e) && e.code === "restaurant_not_found") redirect("/app");
    // Stripe injoignable ⇒ page dégradée sur l'état DB (le gating n'en dépend pas) + Sentry.
    Sentry.captureException(e, { tags: { page: "billing" }, user: { id: restaurantId } });
    const restaurant = await restaurantRepo.getRestaurantById(restaurantId);
    if (!restaurant) redirect("/app");
    overview = {
      tier: restaurant.planTier,
      status: restaurant.planStatus,
      subscription: null,
      invoices: [],
      upgradePreview: null,
    };
    stripeUnavailable = true;
  }

  return (
    <SubscriptionPageBody
      overview={overview}
      stripeUnavailable={stripeUnavailable}
      billingError={billingError}
      billingNotice={billingNotice}
    />
  );
}
