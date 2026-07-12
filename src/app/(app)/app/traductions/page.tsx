import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRestaurant } from "../_lib/requireRestaurant";
import { loadTranslationOverview } from "../_lib/translationOverview";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { LanguageSettingsCard } from "@/interface/ui/components/translations/LanguageSettingsCard";
import { TranslationCoverageSummary } from "@/interface/ui/components/translations/TranslationCoverageSummary";
import { TranslationReviewTable } from "@/interface/ui/components/translations/TranslationReviewTable";

// Section "Traductions" (S4) : gestion des langues du menu public + revue des
// traductions par langue (statuts frais/obsolète/manquant).
export default async function TranslationsPage() {
  const { restaurantId } = await requireRestaurant();

  const restaurant = await new PrismaRestaurantRepository(prisma).getRestaurantById(restaurantId);
  if (!restaurant) redirect("/app");

  // Mutualisé (`cache()`) avec le compteur de la sidebar calculé dans le layout : même requête,
  // même restaurant ⇒ un seul chargement. `null` tant qu'aucune langue cible n'est activée.
  const overview =
    restaurant.menuLocales.length > 0 ? await loadTranslationOverview(restaurantId) : null;

  const t = await getTranslations("Translations");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-h2">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <LanguageSettingsCard
        sourceLocale={restaurant.sourceLocale}
        enabledLocales={restaurant.menuLocales}
        planTier={restaurant.planTier}
      />

      {overview && (
        <>
          <TranslationCoverageSummary coverage={overview.coverage} />

          <section className="space-y-4">
            <div>
              <h2 className="text-h3">{t("reviewTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("reviewDescription")}</p>
            </div>
            <TranslationReviewTable
              sourceLocale={overview.sourceLocale}
              enabledLocales={overview.enabledLocales}
              units={overview.units}
              coverage={overview.coverage}
              canAutoTranslate={PlanPolicy.canUseAutoTranslation(restaurant.planTier)}
            />
          </section>
        </>
      )}
    </div>
  );
}
