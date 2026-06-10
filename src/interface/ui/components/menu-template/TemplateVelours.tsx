import Image from "next/image";
import { collectPresentAllergens, resolveLcpPriority } from "@/domain/menu/publicMenuView";
import { restaurantLogoUrl } from "@/lib/storage-url";
import { MenuCategorySection } from "./MenuCategorySection";
import { TodaySection } from "./TodaySection";
import { Watermark } from "./Watermark";
import { AllergenLegend } from "../AllergenLegend";
import type { MenuTemplateProps } from "./types";

/**
 * Template "Velours" — bar à vin / speakeasy feutré (aubergine, rosé poudré, cuivre, serif chaud
 * Newsreader), palette FIGÉE sombre chaude. Skin **art-dirigé** PRO : coque intime à fort rythme
 * vertical (en-tête centré + sceau cuivre) au-dessus des sous-composants PARTAGÉS + couche headless.
 * Comme NOIR/NEON, le set de surcharges sombres (`--menu-badge/allergen/watermark` dans globals.css)
 * garantit que chips et légende rendent sur surfaces aubergine, sans boîte claire flottante.
 */
export function TemplateVelours({
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
      className="menu-root mx-auto max-w-lg px-5 pb-20 pt-16 sm:px-6"
      aria-label={`Menu de ${snapshot.restaurantName}`}
    >
      <header className="mb-14 text-center">
        {logoUrl && (
          <div className="relative mx-auto mb-5 h-14 w-14">
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
        <h1 className="menu-heading text-5xl font-medium">{snapshot.restaurantName}</h1>
        {/* Sceau : filet cuivre — pastille — filet cuivre. */}
        <div className="mx-auto mt-5 flex items-center justify-center gap-2.5" aria-hidden="true">
          <span className="h-px w-10" style={{ backgroundColor: "var(--menu-accent)" }} />
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--menu-accent)" }}
          />
          <span className="h-px w-10" style={{ backgroundColor: "var(--menu-accent)" }} />
        </div>
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

      <div className="space-y-14">
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
