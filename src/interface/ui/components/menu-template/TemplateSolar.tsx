import Image from "next/image";
import { collectPresentAllergens, resolveLcpPriority } from "@/domain/menu/publicMenuView";
import { restaurantLogoUrl } from "@/lib/storage-url";
import { MenuCategorySection } from "./MenuCategorySection";
import { TodaySection } from "./TodaySection";
import { Watermark } from "./Watermark";
import { AllergenLegend } from "../AllergenLegend";
import type { MenuTemplateProps } from "./types";

/**
 * Template "Solaire" — fast-casual vibrant (corail/ambre saturés, sans géométrique gras Bricolage),
 * palette FIGÉE. Skin **art-dirigé** PRO : coque énergique (nom gras oversize aligné à gauche, barre
 * corail) au-dessus des sous-composants PARTAGÉS + couche headless. Signature : les prix rendent en
 * gros chips corail pleins via `[data-template="SOLAR"] .menu-price` (pur CSS, pas de fork du JSX).
 */
export function TemplateSolar({
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
      className="menu-root mx-auto max-w-lg px-5 pb-16 pt-10 sm:px-6"
      aria-label={`Menu de ${snapshot.restaurantName}`}
    >
      <header className="mb-8">
        <div className="flex items-center gap-3">
          {logoUrl && (
            <div className="relative h-12 w-12 shrink-0">
              <Image
                src={logoUrl}
                alt={snapshot.restaurantName}
                fill
                sizes="48px"
                className="object-contain object-left"
                priority
              />
            </div>
          )}
          <h1 className="menu-heading text-4xl font-extrabold leading-none">
            {snapshot.restaurantName}
          </h1>
        </div>
        <div
          className="mt-3 h-1.5 w-16 rounded-full"
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

      <div className="space-y-9">
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
