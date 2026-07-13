import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Languages } from "lucide-react";
import { requireRestaurant } from "../_lib/requireRestaurant";
import { loadTranslationOverview } from "../_lib/translationOverview";
import { publishMenuAction, regenerateQrAction } from "../actions";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaMenuRepository } from "@/infrastructure/menu/PrismaMenuRepository";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { LanguageManagerSheet } from "@/interface/ui/components/translations/LanguageManagerSheet";
import { TranslationPanel } from "@/interface/ui/components/translations/TranslationPanel";
import { TranslationUpsell } from "@/interface/ui/components/translations/TranslationUpsell";
import { PublishButton } from "@/interface/ui/components/PublishButton";

// Section « Traductions » (S4, refonte 2026 — flux full-auto). Le multilingue est
// PRO uniquement : un non-PRO voit un pitch d'upsell ; un PRO gère ses langues cibles
// et lance la traduction automatique (DeepL). Plus aucune saisie manuelle.
export default async function TranslationsPage() {
  const { restaurantId } = await requireRestaurant();

  const restaurant = await new PrismaRestaurantRepository(prisma).getRestaurantById(restaurantId);
  if (!restaurant) redirect("/app");

  const t = await getTranslations("Translations");

  const canUseMultilingual = PlanPolicy.canUseAutoTranslation(restaurant.planTier);

  const header = (
    <div>
      <h1 className="text-h2">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
    </div>
  );

  // Non-PRO : multilingue verrouillé → pitch d'upsell (aucune langue activable).
  if (!canUseMultilingual) {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        {header}
        <TranslationUpsell />
      </div>
    );
  }

  // Mutualisé (`cache()`) avec le compteur de la sidebar : même requête, même restaurant
  // ⇒ un seul chargement. `null` tant qu'aucune langue cible n'est activée.
  const overview =
    restaurant.menuLocales.length > 0 ? await loadTranslationOverview(restaurantId) : null;

  // Activer/traduire une langue repasse le menu en DRAFT (markMenuAsDraft) sans le
  // republier : on offre l'affordance « Publier » ici pour fermer la boucle sans
  // renvoyer l'utilisateur vers l'éditeur.
  const publishState = overview
    ? await new PrismaMenuRepository(prisma).getMenuPublishState(restaurantId)
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {header}
        {overview && (
          <div className="flex flex-wrap items-start gap-2">
            {publishState && (
              <PublishButton
                planTier={restaurant.planTier}
                menuStatus={publishState.status}
                publishedAt={publishState.publishedAt}
                slug={restaurant.slug}
                publishAction={publishMenuAction}
                regenerateQrAction={regenerateQrAction}
              />
            )}
            <LanguageManagerSheet
              sourceLocale={restaurant.sourceLocale}
              enabledLocales={restaurant.menuLocales}
            />
          </div>
        )}
      </div>

      {overview ? (
        <TranslationPanel enabledLocales={overview.enabledLocales} coverage={overview.coverage} />
      ) : (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <Languages className="mx-auto size-8 text-canard-400" strokeWidth={1.75} aria-hidden />
          <h2 className="mt-4 text-h3">{t("emptyTitle")}</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{t("emptyBody")}</p>
          <div className="mt-5 flex justify-center">
            <LanguageManagerSheet
              sourceLocale={restaurant.sourceLocale}
              enabledLocales={restaurant.menuLocales}
              variant="add"
            />
          </div>
        </div>
      )}
    </div>
  );
}
