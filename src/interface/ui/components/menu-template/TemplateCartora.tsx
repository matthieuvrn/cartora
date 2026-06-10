import Image from "next/image";
import { collectPresentAllergens, resolveLcpPriority } from "@/domain/menu/publicMenuView";
import { restaurantLogoUrl } from "@/lib/storage-url";
import { MenuCategorySection } from "./MenuCategorySection";
import { TodaySection } from "./TodaySection";
import { Watermark } from "./Watermark";
import { AllergenLegend } from "../AllergenLegend";
import type { MenuTemplateProps } from "./types";

/**
 * Template "Cartora" — DA maison (sand / canard / sapin + display Fraunces), palette FIGÉE
 * (ignore le branding du restaurateur). Skin **art-dirigé** : sa propre coque éditoriale
 * (en-tête centré, nom en Fraunces, filet sapin, rythme vertical généreux) au-dessus des
 * sous-composants PARTAGÉS (allergènes / prix / LCP restent DRY). Couleurs + polices via le
 * contrat `--menu-*` + les hooks `[data-template="CARTORA"]` (cf. globals.css), pas de markup
 * dupliqué. Cohérent avec l'app sans copier `.theme-app` (le menu public reste sur `:root`).
 */
export function TemplateCartora({
  snapshot,
  locale,
  showWatermark = false,
  badgeLabels,
  allergenLabels,
  allergenSectionLabel,
  allergenLegendTitle,
  watermarkText,
  todaySectionTitle,
  todaySectionDescription,
  todaySectionDishesSubtitle,
  todaySectionFormulasSubtitle,
}: MenuTemplateProps) {
  const presentAllergens = collectPresentAllergens(snapshot);
  const { firstPhotoLocator } = resolveLcpPriority(snapshot);

  const logoUrl = snapshot.restaurantLogoPath
    ? restaurantLogoUrl(snapshot.restaurantLogoPath)
    : null;

  const hasToday =
    (snapshot.dailyItems && snapshot.dailyItems.length > 0) ||
    (snapshot.formulas && snapshot.formulas.length > 0);

  return (
    <main
      className="menu-root mx-auto max-w-lg px-5 pb-16 pt-12 sm:px-6"
      aria-label={`Menu de ${snapshot.restaurantName}`}
    >
      <header className="mb-12 text-center">
        {logoUrl && (
          <div className="relative mx-auto mb-4 h-14 w-14">
            <Image
              src={logoUrl}
              alt={snapshot.restaurantName}
              fill
              sizes="56px"
              className="object-contain"
              priority
            />
          </div>
        )}
        <h1 className="menu-heading text-4xl font-semibold">{snapshot.restaurantName}</h1>
        <div
          className="mx-auto mt-5 h-px w-16"
          style={{ backgroundColor: "var(--menu-accent)" }}
          aria-hidden="true"
        />
      </header>

      {hasToday && (
        <TodaySection
          items={snapshot.dailyItems ?? []}
          formulas={snapshot.formulas ?? []}
          locale={locale}
          title={todaySectionTitle}
          description={todaySectionDescription}
          dishesSubtitle={todaySectionDishesSubtitle}
          formulasSubtitle={todaySectionFormulasSubtitle}
          badgeLabels={badgeLabels}
          allergenLabels={allergenLabels}
          allergenSectionLabel={allergenSectionLabel}
        />
      )}

      <div className="space-y-12">
        {snapshot.categories.map((category) => (
          <MenuCategorySection
            key={category.name}
            category={category}
            locale={locale}
            badgeLabels={badgeLabels}
            allergenLabels={allergenLabels}
            allergenSectionLabel={allergenSectionLabel}
            priorityItemIndex={
              firstPhotoLocator?.categoryName === category.name ? firstPhotoLocator.itemIndex : null
            }
          />
        ))}
      </div>

      <AllergenLegend
        presentAllergens={presentAllergens}
        labels={allergenLabels}
        title={allergenLegendTitle}
      />
      {showWatermark && watermarkText && <Watermark text={watermarkText} />}
    </main>
  );
}
