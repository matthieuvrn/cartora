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
  todaySectionTitle: string;
  todaySectionDescription?: string;
  todaySectionDishesSubtitle?: string;
  todaySectionFormulasSubtitle?: string;
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
  todaySectionTitle,
  todaySectionDescription,
  todaySectionDishesSubtitle,
  todaySectionFormulasSubtitle,
}: Props) {
  const presentAllergens = new Set<Allergen>();
  for (const daily of snapshot.dailyItems ?? []) {
    for (const a of daily.allergens) presentAllergens.add(a);
  }
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
  const firstDailyPhotoIndex = (snapshot.dailyItems ?? []).findIndex((d) => d.imagePath);

  const logoUrl = snapshot.restaurantLogoPath
    ? restaurantLogoUrl(snapshot.restaurantLogoPath)
    : null;

  return (
    <div
      className="min-h-screen text-zinc-900"
      style={{ backgroundColor: "var(--brand-bg, #fff7ed)" }}
    >
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
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--brand-primary, #ea580c)" }}
          >
            {snapshot.restaurantName}
          </h1>
        </header>

        {((snapshot.dailyItems && snapshot.dailyItems.length > 0) ||
          (snapshot.formulas && snapshot.formulas.length > 0)) &&
          (() => {
            const hasDishes = !!(snapshot.dailyItems && snapshot.dailyItems.length > 0);
            const hasFormulas = !!(snapshot.formulas && snapshot.formulas.length > 0);
            const showSubtitles = hasDishes && hasFormulas;
            return (
              <section aria-labelledby="daily-menu-heading" className="mb-10">
                <div className="mb-4">
                  <span
                    id="daily-menu-heading"
                    className="inline-block rounded-full px-4 py-1.5 text-sm font-bold tracking-wide text-white"
                    style={{ backgroundColor: "var(--brand-primary, #ea580c)" }}
                  >
                    {todaySectionTitle}
                  </span>
                  {todaySectionDescription && (
                    <p className="mt-1 text-xs text-zinc-600">{todaySectionDescription}</p>
                  )}
                </div>
                {hasDishes && (
                  <>
                    {showSubtitles && todaySectionDishesSubtitle && (
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        {todaySectionDishesSubtitle}
                      </h3>
                    )}
                    <ul className="space-y-4" role="list">
                      {snapshot.dailyItems!.map((item, index) => (
                        <ModernItemCard
                          key={item.id}
                          item={item}
                          locale={locale}
                          badgeLabels={badgeLabels}
                          allergenLabels={allergenLabels}
                          allergenSectionLabel={allergenSectionLabel}
                          priority={index === firstDailyPhotoIndex}
                        />
                      ))}
                    </ul>
                  </>
                )}
                {hasFormulas && (
                  <>
                    {showSubtitles && todaySectionFormulasSubtitle && (
                      <h3 className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
                        {todaySectionFormulasSubtitle}
                      </h3>
                    )}
                    <ul
                      className={`space-y-3 ${hasDishes && !showSubtitles ? "mt-4" : ""}`}
                      role="list"
                    >
                      {snapshot.formulas!.map((formula) => {
                        const name =
                          locale === "fr" ? formula.nameFr : formula.nameEn || formula.nameFr;
                        const desc =
                          locale === "fr"
                            ? formula.descriptionFr
                            : formula.descriptionEn || formula.descriptionFr;
                        return (
                          <li
                            key={formula.id}
                            className="rounded-2xl border-2 border-dashed p-4"
                            style={{ borderColor: "var(--brand-primary, #ea580c)" }}
                          >
                            <div className="flex items-baseline justify-between gap-3">
                              <h3 className="font-bold">{name}</h3>
                              <span
                                className="text-base font-extrabold tabular-nums"
                                style={{ color: "var(--brand-primary, #ea580c)" }}
                              >
                                {new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
                                  style: "currency",
                                  currency: "EUR",
                                }).format(formula.priceCents / 100)}
                              </span>
                            </div>
                            {desc && (
                              <p className="mt-1 whitespace-pre-line text-sm text-zinc-700">
                                {desc}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </section>
            );
          })()}

        <div className="space-y-10">
          {snapshot.categories.map((category) => (
            <section key={category.name}>
              <div className="mb-4">
                <span
                  className="inline-block rounded-full px-4 py-1.5 text-sm font-bold tracking-wide text-white"
                  style={{ backgroundColor: "var(--brand-primary, #ea580c)" }}
                >
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
            <h2
              className="mb-3 text-sm font-bold uppercase tracking-wide"
              style={{ color: "var(--brand-primary, #ea580c)" }}
            >
              {allergenLegendTitle}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {Array.from(presentAllergens).map((a) => (
                <li
                  key={a}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    // Pour rester proche du rendu historique `bg-orange-100 text-orange-800`,
                    // on construit un fond et un texte dérivés de la primary via color-mix.
                    backgroundColor: "color-mix(in srgb, var(--brand-primary, #ea580c) 15%, white)",
                    color: "color-mix(in srgb, var(--brand-primary, #ea580c) 80%, black)",
                  }}
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
        <div
          className="relative aspect-square w-full overflow-hidden"
          style={{
            backgroundColor: "color-mix(in srgb, var(--brand-primary, #ea580c) 15%, white)",
          }}
        >
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
            className="shrink-0 rounded-full px-3 py-1 text-sm font-bold text-white tabular-nums"
            style={{ backgroundColor: "var(--brand-accent, #ea580c)" }}
            aria-label={formatPriceAria(item.priceCents, locale)}
          >
            {formatPrice(item.priceCents, locale)}
          </span>
        </div>
      </div>
    </li>
  );
}
