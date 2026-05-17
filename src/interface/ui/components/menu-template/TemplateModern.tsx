import Image from "next/image";
import { Sparkles, Flame } from "lucide-react";
import type { PublicMenuSnapshot, PublicMenuItem } from "@/domain/menu/PublicMenuTypes";
import type { Allergen, ItemBadge } from "@/domain/menu/ItemPolicy";
import { itemImageUrl, restaurantLogoUrl } from "@/lib/storage-url";
import { AllergenIcons, type AllergenLabels } from "../AllergenIcons";
import { Watermark } from "./Watermark";

/**
 * Template "Modern" — clair, moelleux, accent vif.
 * Réservé au tier PRO (gating via `PlanPolicy.canUseTemplate`).
 *
 * Layout structurel (différent de Classic) :
 *   - Fond crème chaud, items rendus comme cards arrondies à ombre douce
 *   - Catégories: chips arrondies en accent
 *   - Photo en haut de la card, ratio carré (1/1) pour effet "produit"
 *   - Badges colorés saillants (orange/teal)
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
};

const badgeConfig: Record<
  Exclude<ItemBadge, "NONE">,
  { icon: typeof Sparkles; className: string }
> = {
  NEW: { icon: Sparkles, className: "bg-teal-500 text-white" },
  POPULAR: { icon: Flame, className: "bg-orange-500 text-white" },
};

function formatPrice(cents: number, locale: "fr" | "en"): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatPriceAria(cents: number, locale: "fr" | "en"): string {
  const euros = Math.floor(cents / 100);
  const remaining = cents % 100;
  if (locale === "fr") {
    return remaining > 0 ? `${euros} euros ${remaining}` : `${euros} euros`;
  }
  return remaining > 0 ? `${euros} euros ${remaining} cents` : `${euros} euros`;
}

function getLocalizedText(fr: string, en: string, locale: "fr" | "en"): string {
  if (locale === "en") return en || fr;
  return fr;
}

export function TemplateModern({
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

  const logoUrl = snapshot.restaurantLogoPath
    ? restaurantLogoUrl(snapshot.restaurantLogoPath)
    : null;

  return (
    <div className="min-h-screen bg-orange-50 text-zinc-900">
      <main
        className="mx-auto max-w-xl px-4 py-8 sm:px-6"
        aria-label={`Menu de ${snapshot.restaurantName}`}
      >
        <header className="mb-8 flex items-center gap-4">
          {logoUrl && (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm">
              <Image
                src={logoUrl}
                alt={snapshot.restaurantName}
                fill
                sizes="56px"
                className="object-contain p-1"
                priority
              />
            </div>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight text-orange-600">
            {snapshot.restaurantName}
          </h1>
        </header>

        <div className="space-y-10">
          {snapshot.categories.map((category) => (
            <section key={category.name}>
              <div className="mb-4">
                <span className="inline-block rounded-full bg-orange-600 px-4 py-1.5 text-sm font-bold tracking-wide text-white">
                  {category.name}
                </span>
              </div>
              <ul className="space-y-4" role="list">
                {category.items.map((item, index) => (
                  <ModernItemCard
                    key={item.nameFr}
                    item={item}
                    locale={locale}
                    badgeLabels={badgeLabels}
                    allergenLabels={allergenLabels}
                    allergenSectionLabel={allergenSectionLabel}
                    priority={
                      firstPhotoLocator?.categoryName === category.name &&
                      index === firstPhotoLocator.itemIndex
                    }
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>

        {presentAllergens.size > 0 && (
          <section className="mt-12 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-orange-600">
              {allergenLegendTitle}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {Array.from(presentAllergens).map((a) => (
                <li
                  key={a}
                  className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800"
                >
                  {allergenLabels[a].legal}
                </li>
              ))}
            </ul>
          </section>
        )}

        {showWatermark && watermarkText && <Watermark text={watermarkText} />}
      </main>
    </div>
  );
}

type ItemCardProps = {
  item: PublicMenuItem;
  locale: "fr" | "en";
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  allergenLabels: AllergenLabels;
  allergenSectionLabel: string;
  priority?: boolean;
};

function ModernItemCard({
  item,
  locale,
  badgeLabels,
  allergenLabels,
  allergenSectionLabel,
  priority = false,
}: ItemCardProps) {
  const name = getLocalizedText(item.nameFr, item.nameEn, locale);
  const description = getLocalizedText(item.descriptionFr, item.descriptionEn, locale);
  const imageUrl = item.imagePath ? itemImageUrl(item.imagePath) : null;
  const altText = getLocalizedText(item.altTextFr, item.altTextEn, locale) || name;

  return (
    <li className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {imageUrl && (
        <div className="relative aspect-square w-full overflow-hidden bg-orange-100">
          <Image
            src={imageUrl}
            alt={altText}
            fill
            sizes="(min-width: 768px) 600px, 100vw"
            className="object-cover"
            priority={priority}
          />
        </div>
      )}
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold">{name}</span>
              {item.badge !== "NONE" &&
                (() => {
                  const config = badgeConfig[item.badge];
                  const Icon = config.icon;
                  return (
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
                    >
                      <Icon className="size-3" aria-hidden="true" />
                      {badgeLabels[item.badge]}
                    </span>
                  );
                })()}
            </div>
            {description && <p className="text-sm leading-relaxed text-zinc-600">{description}</p>}
            {item.allergens.length > 0 && (
              <AllergenIcons
                allergens={item.allergens}
                labels={allergenLabels}
                listLabel={allergenSectionLabel}
              />
            )}
          </div>
          <span
            className="shrink-0 rounded-full bg-orange-600 px-3 py-1 text-sm font-bold text-white tabular-nums"
            aria-label={formatPriceAria(item.priceCents, locale)}
          >
            {formatPrice(item.priceCents, locale)}
          </span>
        </div>
      </div>
    </li>
  );
}
