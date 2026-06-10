import Image from "next/image";
import { collectPresentAllergens, resolveLcpPriority } from "@/domain/menu/publicMenuView";
import { restaurantLogoUrl } from "@/lib/storage-url";
import { MenuCategorySection } from "./MenuCategorySection";
import { TodaySection } from "./TodaySection";
import { Watermark } from "./Watermark";
import { AllergenLegend } from "../AllergenLegend";
import type { MenuTemplateProps } from "./types";

/**
 * Template "Zen" — japandi minimal (greige/terracotta sourds, sans humaniste fin Schibsted),
 * palette FIGÉE. Skin **art-dirigé** PRO : coque ultra-épurée (en-tête discret, blanc massif,
 * rythme vertical très ample) au-dessus des sous-composants PARTAGÉS + couche headless. La
 * distinction tient à l'air et aux titres de catégorie discrets espacés (cf. `[data-template="ZEN"]`).
 */
export function TemplateZen({
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
      className="menu-root mx-auto max-w-lg px-6 pb-24 pt-16"
      aria-label={`Menu de ${snapshot.restaurantName}`}
    >
      <header className="mb-16 text-center">
        {logoUrl && (
          <div className="relative mx-auto mb-4 h-10 w-10">
            <Image
              src={logoUrl}
              alt={snapshot.restaurantName}
              fill
              sizes="40px"
              className="object-contain"
              priority
            />
          </div>
        )}
        <h1 className="menu-heading text-2xl font-medium tracking-wide">
          {snapshot.restaurantName}
        </h1>
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

      <div className="space-y-16">
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
