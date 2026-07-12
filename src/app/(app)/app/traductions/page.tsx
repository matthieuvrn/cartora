import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Languages } from "lucide-react";
import { requireRestaurant } from "../_lib/requireRestaurant";
import { loadTranslationOverview } from "../_lib/translationOverview";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { LanguageManagerSheet } from "@/interface/ui/components/translations/LanguageManagerSheet";
import { TranslationWorkspace } from "@/interface/ui/components/translations/TranslationWorkspace";

// Section "Traductions" (S4, refonte 2026) : gestion des langues du menu public + revue
// des traductions par entité (une carte par plat, statuts frais/obsolète/manquant live).
export default async function TranslationsPage() {
  const { restaurantId } = await requireRestaurant();

  const restaurant = await new PrismaRestaurantRepository(prisma).getRestaurantById(restaurantId);
  if (!restaurant) redirect("/app");

  // Mutualisé (`cache()`) avec le compteur de la sidebar : même requête, même restaurant
  // ⇒ un seul chargement. `null` tant qu'aucune langue cible n'est activée.
  const overview =
    restaurant.menuLocales.length > 0 ? await loadTranslationOverview(restaurantId) : null;

  const t = await getTranslations("Translations");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h2">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {overview && (
          <LanguageManagerSheet
            sourceLocale={restaurant.sourceLocale}
            enabledLocales={restaurant.menuLocales}
            planTier={restaurant.planTier}
          />
        )}
      </div>

      {overview ? (
        <TranslationWorkspace
          sourceLocale={overview.sourceLocale}
          enabledLocales={overview.enabledLocales}
          units={overview.units}
          canAutoTranslate={PlanPolicy.canUseAutoTranslation(restaurant.planTier)}
        />
      ) : (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <Languages className="mx-auto size-8 text-canard-400" strokeWidth={1.75} aria-hidden />
          <h2 className="mt-4 text-h3">{t("emptyTitle")}</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{t("emptyBody")}</p>
          <div className="mt-5 flex justify-center">
            <LanguageManagerSheet
              sourceLocale={restaurant.sourceLocale}
              enabledLocales={restaurant.menuLocales}
              planTier={restaurant.planTier}
              variant="add"
            />
          </div>
        </div>
      )}
    </div>
  );
}
