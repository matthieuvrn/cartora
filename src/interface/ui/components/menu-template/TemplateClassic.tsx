import Image from "next/image";
import { collectPresentAllergens, resolveLcpPriority } from "@/domain/menu/publicMenuView";
import { restaurantLogoUrl } from "@/lib/storage-url";
import { MenuCategorySection } from "./MenuCategorySection";
import { TodaySection } from "./TodaySection";
import { Watermark } from "./Watermark";
import { AllergenLegend } from "../AllergenLegend";
import type { MenuTemplateProps } from "./types";

/**
 * Template "Classic" — rendu par défaut, hérité de la version pré-S2.2.
 * Disponible sur tous les tiers. Style minimaliste, typo sans-serif, fond clair.
 *
 * Seul template `supportsColorCustomization` : enveloppé par `BrandingStyleScope`
 * (cf. index.tsx) → lit `--brand-*`. Consomme la couche headless `publicMenuView`.
 */
export function TemplateClassic({
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
  // Légende INCO partagée (items + plats du jour) + cible LCP (le daily avec photo
  // prime, sinon 1re photo de catégorie). Logique factorisée + testée en domaine.
  const presentAllergens = collectPresentAllergens(snapshot);
  const { firstPhotoLocator } = resolveLcpPriority(snapshot);

  const logoUrl = snapshot.restaurantLogoPath
    ? restaurantLogoUrl(snapshot.restaurantLogoPath)
    : null;

  return (
    <main
      className="mx-auto max-w-lg px-4 py-6 sm:px-6"
      aria-label={`Menu de ${snapshot.restaurantName}`}
      style={{ backgroundColor: "var(--brand-bg, transparent)" }}
    >
      {logoUrl && (
        <div className="relative mb-3 h-16 w-full">
          <Image
            src={logoUrl}
            alt={snapshot.restaurantName}
            fill
            sizes="128px"
            className="object-contain object-left"
            priority
          />
        </div>
      )}
      <h1
        className="mb-6 text-2xl font-bold"
        style={{ color: "var(--brand-primary, currentColor)" }}
      >
        {snapshot.restaurantName}
      </h1>
      {((snapshot.dailyItems && snapshot.dailyItems.length > 0) ||
        (snapshot.formulas && snapshot.formulas.length > 0)) && (
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
      <div className="space-y-8">
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
