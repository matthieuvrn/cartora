import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRestaurant } from "../_lib/requireRestaurant";
import { loadTranslationOverview } from "../_lib/translationOverview";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PlanPolicy } from "@/domain/billing/PlanPolicy";
import { LanguagesCard } from "@/interface/ui/components/translations/LanguagesCard";
import { TranslationUpsell } from "@/interface/ui/components/translations/TranslationUpsell";

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

  // Activer/traduire une langue repasse le menu en DRAFT (markMenuAsDraft) sans le republier :
  // l'affordance « Publier » (+ nudge de traduction) vit dans la barre de publication globale du
  // shell (PublishBar), présente sur cette page comme partout ailleurs.
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {header}

      <LanguagesCard
        sourceLocale={restaurant.sourceLocale}
        enabledLocales={restaurant.menuLocales}
        coverage={overview?.coverage ?? []}
      />
    </div>
  );
}
