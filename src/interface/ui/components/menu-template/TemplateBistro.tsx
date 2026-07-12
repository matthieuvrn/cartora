import Image from "next/image";
import { collectPresentAllergens } from "@/domain/menu/publicMenuView";
import { restaurantLogoUrl } from "@/lib/storage-url";
import { MenuCategorySection } from "./MenuCategorySection";
import { TodaySection } from "./TodaySection";
import { Watermark } from "./Watermark";
import { AllergenLegend } from "../AllergenLegend";
import type { MenuTemplateProps } from "./types";

/**
 * Template "Bistrot" — néo-bistrot parisien (ivoire crème, bordeaux/laiton, serif Cormorant),
 * palette FIGÉE. Skin **art-dirigé** PRO : sa coque (en-tête centré + ornement art-déco filet/
 * losange laiton) au-dessus des sous-composants PARTAGÉS + couche headless. Couleurs/polices via
 * le contrat `--menu-*` + les hooks `[data-template="BISTRO"]` (cf. globals.css) — pas de markup dupliqué.
 */
export function TemplateBistro({
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
      <header className="mb-10 text-center">
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
        {/* Ornement art-déco : filet laiton — losange — filet laiton. */}
        <div className="mx-auto mt-4 flex items-center justify-center gap-2" aria-hidden="true">
          <span className="h-px w-10" style={{ backgroundColor: "var(--menu-accent)" }} />
          <span
            className="h-1.5 w-1.5 rotate-45"
            style={{ backgroundColor: "var(--menu-accent)" }}
          />
          <span className="h-px w-10" style={{ backgroundColor: "var(--menu-accent)" }} />
        </div>
      </header>

      {hasToday && (
        <TodaySection
          sourceLocale={snapshot.sourceLocale}
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

      <div className="space-y-11">
        {snapshot.categories.map((category) => (
          <MenuCategorySection
            sourceLocale={snapshot.sourceLocale}
            key={category.name}
            category={category}
            locale={locale}
            badgeLabels={badgeLabels}
            allergenLabels={allergenLabels}
            allergenSectionLabel={allergenSectionLabel}
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
