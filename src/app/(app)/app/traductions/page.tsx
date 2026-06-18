import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRestaurant } from "../_lib/requireRestaurant";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaMenuRepository } from "@/infrastructure/menu/PrismaMenuRepository";
import { PrismaTranslationRepository } from "@/infrastructure/menu/PrismaTranslationRepository";
import { GetTranslationOverview } from "@/application/use-cases/GetTranslationOverview";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { LanguageSettingsCard } from "@/interface/ui/components/translations/LanguageSettingsCard";
import { TranslationReviewTable } from "@/interface/ui/components/translations/TranslationReviewTable";

// Section "Traductions" (S4) : gestion des langues du menu public + revue des
// traductions par langue (statuts frais/obsolète/manquant).
export default async function TranslationsPage() {
  const { restaurantId } = await requireRestaurant();

  const restaurant = await new PrismaRestaurantRepository(prisma).getRestaurantById(restaurantId);
  if (!restaurant) redirect("/app");

  const overview = await new GetTranslationOverview(
    new PrismaMenuRepository(prisma),
    new PrismaTranslationRepository(prisma),
  ).execute({ restaurantId });

  const t = await getTranslations("Translations");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-h2">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <LanguageSettingsCard
        sourceLocale={restaurant.sourceLocale}
        enabledLocales={restaurant.menuLocales}
        planTier={restaurant.planTier}
      />

      {restaurant.menuLocales.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-h3">{t("reviewTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("reviewDescription")}</p>
          </div>
          <TranslationReviewTable
            sourceLocale={overview.sourceLocale}
            enabledLocales={overview.enabledLocales}
            units={overview.units}
            canAutoTranslate={PlanPolicy.canUseAutoTranslation(restaurant.planTier)}
          />
        </section>
      )}
    </div>
  );
}
