import Image from "next/image";
import { collectPresentAllergens } from "@/domain/menu/publicMenuView";
import { restaurantLogoUrl } from "@/lib/storage-url";
import { MenuCategorySection } from "./MenuCategorySection";
import { TodaySection } from "./TodaySection";
import { Watermark } from "./Watermark";
import { AllergenLegend } from "../AllergenLegend";
import type { MenuTemplateProps } from "./types";

/**
 * Template "Néon" — bar nocturne (fond nuit profond, accents néon cyan/magenta, display condensé
 * bold Archivo en capitales), palette FIGÉE sombre. Skin **art-dirigé** PRO : coque (nom capitales
 * + barre néon à halo) au-dessus des sous-composants PARTAGÉS + couche headless. Le keystone Étape 6
 * (tokens sombres) rend chips/légende sur surfaces nuit — aucune boîte claire sur le fond profond.
 */
export function TemplateNeon({
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
          <div className="relative mx-auto mb-4 h-12 w-12">
            <Image
              src={logoUrl}
              alt={snapshot.restaurantName}
              fill
              sizes="48px"
              className="object-contain"
              priority
            />
          </div>
        )}
        <h1 className="menu-heading text-4xl font-extrabold">{snapshot.restaurantName}</h1>
        {/* Barre néon à halo (magenta) — `box-shadow` statique, pas d'animation. */}
        <div
          className="mx-auto mt-4 h-0.5 w-24 rounded-full"
          style={{
            backgroundColor: "var(--menu-accent)",
            boxShadow: "0 0 12px var(--menu-accent)",
          }}
          aria-hidden="true"
        />
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

      <div className="space-y-10">
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
