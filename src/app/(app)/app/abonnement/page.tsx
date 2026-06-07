import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRestaurant } from "../_lib/requireRestaurant";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaBillingRepository } from "@/infrastructure/billing/PrismaBillingRepository";
import { BillingStatus } from "@/interface/ui/components/BillingStatus";

export default async function BillingPage() {
  const { restaurantId } = await requireRestaurant();

  const restaurantRepo = new PrismaRestaurantRepository(prisma);
  const restaurant = await restaurantRepo.getRestaurantById(restaurantId);
  if (!restaurant) redirect("/app");

  const billingRepo = new PrismaBillingRepository(prisma);
  const billing = await billingRepo.findByRestaurantId(restaurantId);

  const t = await getTranslations("Billing");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-h2">{t("sectionTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("sectionDescription")}</p>
      </div>
      <BillingStatus
        planStatus={restaurant.planStatus}
        planTier={restaurant.planTier}
        hasBilling={billing !== null}
      />
    </div>
  );
}
