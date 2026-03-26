import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import type { CategoryType } from "@/domain/menu/MenuTypes";
import { MenuCategorySection } from "./MenuCategorySection";
import { Watermark } from "./Watermark";

type Props = {
  snapshot: PublicMenuSnapshot;
  locale: "fr" | "en";
  showWatermark?: boolean;
  categoryLabels: Record<CategoryType, string>;
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  watermarkText?: string;
};

export function MenuTemplate({
  snapshot,
  locale,
  showWatermark = false,
  categoryLabels,
  badgeLabels,
  watermarkText,
}: Props) {
  return (
    <main
      className="mx-auto max-w-lg px-4 py-6 sm:px-6"
      aria-label={`Menu de ${snapshot.restaurantName}`}
    >
      <h1 className="mb-6 text-2xl font-bold">{snapshot.restaurantName}</h1>
      <div className="space-y-8">
        {snapshot.categories.map((category) => (
          <MenuCategorySection
            key={category.type}
            category={category}
            locale={locale}
            categoryLabels={categoryLabels}
            badgeLabels={badgeLabels}
          />
        ))}
      </div>
      {showWatermark && watermarkText && <Watermark text={watermarkText} />}
    </main>
  );
}
