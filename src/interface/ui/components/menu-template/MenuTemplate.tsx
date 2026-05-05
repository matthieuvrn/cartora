import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import type { Allergen } from "@/domain/menu/ItemPolicy";
import { MenuCategorySection } from "./MenuCategorySection";
import { Watermark } from "./Watermark";
import { AllergenLegend } from "../AllergenLegend";
import type { AllergenLabels } from "../AllergenIcons";

type Props = {
  snapshot: PublicMenuSnapshot;
  locale: "fr" | "en";
  showWatermark?: boolean;
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  allergenLabels: AllergenLabels;
  allergenSectionLabel: string;
  allergenLegendTitle: string;
  watermarkText?: string;
};

export function MenuTemplate({
  snapshot,
  locale,
  showWatermark = false,
  badgeLabels,
  allergenLabels,
  allergenSectionLabel,
  allergenLegendTitle,
  watermarkText,
}: Props) {
  const presentAllergens = new Set<Allergen>();
  let firstPhotoLocator: { categoryName: string; itemIndex: number } | null = null;
  for (const category of snapshot.categories) {
    for (let i = 0; i < category.items.length; i++) {
      const item = category.items[i];
      for (const a of item.allergens) presentAllergens.add(a);
      if (!firstPhotoLocator && item.imagePath) {
        firstPhotoLocator = { categoryName: category.name, itemIndex: i };
      }
    }
  }

  return (
    <main
      className="mx-auto max-w-lg px-4 py-6 sm:px-6"
      aria-label={`Menu de ${snapshot.restaurantName}`}
    >
      <h1 className="mb-6 text-2xl font-bold">{snapshot.restaurantName}</h1>
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
