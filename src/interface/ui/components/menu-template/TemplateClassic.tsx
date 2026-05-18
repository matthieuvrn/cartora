import Image from "next/image";
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import type { Allergen } from "@/domain/menu/ItemPolicy";
import { restaurantLogoUrl } from "@/lib/storage-url";
import { MenuCategorySection } from "./MenuCategorySection";
import { DailyMenuSection } from "./DailyMenuSection";
import { Watermark } from "./Watermark";
import { AllergenLegend } from "../AllergenLegend";
import type { AllergenLabels } from "../AllergenIcons";

/**
 * Template "Classic" — rendu par défaut, hérité de la version pré-S2.2.
 * Disponible sur tous les tiers. Style minimaliste, typo sans-serif, fond clair.
 *
 * ⚠ À chaque évolution du modèle PublicMenuSnapshot (allergens, photos, branding…),
 * penser à propager la même feature dans TemplateElegant et TemplateModern. Le coût
 * × 3 a été accepté sciemment (cf. plan d'exécution S2.2).
 */
type Props = {
  snapshot: PublicMenuSnapshot;
  locale: "fr" | "en";
  showWatermark?: boolean;
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  allergenLabels: AllergenLabels;
  allergenSectionLabel: string;
  allergenLegendTitle: string;
  watermarkText?: string;
  dailyMenuTitle: string;
  dailyMenuDescription?: string;
};

export function TemplateClassic({
  snapshot,
  locale,
  showWatermark = false,
  badgeLabels,
  allergenLabels,
  allergenSectionLabel,
  allergenLegendTitle,
  watermarkText,
  dailyMenuTitle,
  dailyMenuDescription,
}: Props) {
  const presentAllergens = new Set<Allergen>();
  // Les allergens des daily items doivent aussi alimenter la légende
  // (réglementation INCO — légende partagée).
  for (const daily of snapshot.dailyItems ?? []) {
    for (const a of daily.allergens) presentAllergens.add(a);
  }
  // Priority loading : si un daily item a une photo, c'est lui qui prend le slot LCP
  // (rendu en haut), sinon on retombe sur la 1re photo des catégories.
  const dailyHasPhoto = (snapshot.dailyItems ?? []).some((d) => d.imagePath);
  let firstPhotoLocator: { categoryName: string; itemIndex: number } | null = null;
  for (const category of snapshot.categories) {
    for (let i = 0; i < category.items.length; i++) {
      const item = category.items[i];
      for (const a of item.allergens) presentAllergens.add(a);
      if (!firstPhotoLocator && !dailyHasPhoto && item.imagePath) {
        firstPhotoLocator = { categoryName: category.name, itemIndex: i };
      }
    }
  }

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
      {snapshot.dailyItems && snapshot.dailyItems.length > 0 && (
        <DailyMenuSection
          items={snapshot.dailyItems}
          locale={locale}
          title={dailyMenuTitle}
          description={dailyMenuDescription}
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
