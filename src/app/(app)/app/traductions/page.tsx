import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRestaurant } from "../_lib/requireRestaurant";
import { loadTranslationOverview } from "../_lib/translationOverview";
import { publishMenuAction, regenerateQrAction } from "../actions";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaMenuRepository } from "@/infrastructure/menu/PrismaMenuRepository";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { LanguagesCard } from "@/interface/ui/components/translations/LanguagesCard";
import { TranslationUpsell } from "@/interface/ui/components/translations/TranslationUpsell";
import { PublishButton } from "@/interface/ui/components/PublishButton";

// Section « Traductions » (S4, refonte 2026 — flux full-auto). Le multilingue est
// PRO uniquement : un non-PRO voit un pitch d'upsell ; un PRO gère ses langues cibles
// et lance la traduction automatique (DeepL) depuis une carte unique. Plus de Sheet,
// plus d'état vide dédié : les interrupteurs sont la surface principale.
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
      <div className="mx-auto max-w-3xl space-y-8">
        {header}
        <TranslationUpsell />
      </div>
    );
  }

  // Couverture par langue activée (mutualisée `cache()` avec le compteur de la sidebar).
  // `null` tant qu'aucune langue cible n'est activée ⇒ la carte s'affiche quand même,
  // interrupteurs tous éteints.
  const overview =
    restaurant.menuLocales.length > 0 ? await loadTranslationOverview(restaurantId) : null;

  // Activer/traduire une langue repasse le menu en DRAFT (markMenuAsDraft) sans le
  // republier : on offre l'affordance « Publier » ici pour fermer la boucle sans
  // renvoyer l'utilisateur vers l'éditeur.
  const publishState = await new PrismaMenuRepository(prisma).getMenuPublishState(restaurantId);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {header}
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
      </div>

      <LanguagesCard
        sourceLocale={restaurant.sourceLocale}
        enabledLocales={restaurant.menuLocales}
        coverage={overview?.coverage ?? []}
      />
    </div>
  );
}
