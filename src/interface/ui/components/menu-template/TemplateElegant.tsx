import Image from "next/image";
import type { PublicMenuItem } from "@/domain/menu/PublicMenuTypes";
import {
  collectPresentAllergens,
  formatPrice,
  formatPriceAria,
  getLocalizedText,
  resolveLcpPriority,
} from "@/domain/menu/publicMenuView";
import { itemImageUrl, restaurantLogoUrl } from "@/lib/storage-url";
import { AllergenIcons, type AllergenLabels } from "../AllergenIcons";
import { Watermark } from "./Watermark";
import type { MenuTemplateProps } from "./types";

/**
 * Template "Elegant" — gastronomique, fond sombre, serif.
 * Réservé au tier PRO (gating via `PlanPolicy.canUseTemplate`).
 *
 * Layout structurel propre (pas une simple ré-application de couleurs/typos sur Classic) :
 *   - Photo "héro" pour le premier plat avec photo (ratio 21/9 au lieu de 16/9)
 *   - Items sans dividers visibles, espacement aéré
 *   - Badges en small caps tracking-widest sans pill background
 *   - Accent doré (amber-400) sur les prix et l'accent line sous le nom
 */
export function TemplateElegant({
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
  // Légende INCO partagée + cible LCP — couche headless factorisée (cf. publicMenuView).
  const presentAllergens = collectPresentAllergens(snapshot);
  const { firstPhotoLocator, firstDailyPhotoIndex } = resolveLcpPriority(snapshot);

  const logoUrl = snapshot.restaurantLogoPath
    ? restaurantLogoUrl(snapshot.restaurantLogoPath)
    : null;

  return (
    <div
      className="min-h-screen text-stone-100"
      style={{ backgroundColor: "var(--brand-bg, #0c0a09)" }}
    >
      <main
        className="mx-auto max-w-2xl px-6 py-12 font-serif"
        aria-label={`Menu de ${snapshot.restaurantName}`}
      >
        <header className="mb-12 text-center">
          {logoUrl && (
            <div className="relative mx-auto mb-6 h-20 w-32">
              <Image
                src={logoUrl}
                alt={snapshot.restaurantName}
                fill
                sizes="128px"
                className="object-contain"
                priority
              />
            </div>
          )}
          <h1
            className="text-4xl italic tracking-wide"
            style={{ color: "var(--brand-primary, currentColor)" }}
          >
            {snapshot.restaurantName}
          </h1>
          <div
            className="mx-auto mt-4 h-px w-16 opacity-70"
            style={{ backgroundColor: "var(--brand-accent, #fbbf24)" }}
            aria-hidden="true"
          />
        </header>

        {((snapshot.dailyItems && snapshot.dailyItems.length > 0) ||
          (snapshot.formulas && snapshot.formulas.length > 0)) &&
          (() => {
            const hasDishes = !!(snapshot.dailyItems && snapshot.dailyItems.length > 0);
            const hasFormulas = !!(snapshot.formulas && snapshot.formulas.length > 0);
            const showSubtitles = hasDishes && hasFormulas;
            return (
              <section aria-labelledby="daily-menu-heading" className="mb-12">
                <h2
                  id="daily-menu-heading"
                  className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em]"
                  style={{ color: "var(--brand-accent, #fbbf24)" }}
                >
                  {todaySectionTitle}
                </h2>
                {todaySectionDescription && (
                  <p className="mb-6 text-center text-xs italic text-stone-400">
                    {todaySectionDescription}
                  </p>
                )}
                {hasDishes && (
                  <>
                    {showSubtitles && todaySectionDishesSubtitle && (
                      <h3 className="mb-3 text-center text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-stone-400">
                        {todaySectionDishesSubtitle}
                      </h3>
                    )}
                    <ul className="space-y-8" role="list">
                      {snapshot.dailyItems!.map((item, index) => (
                        <ElegantItemRow
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
                      <h3 className="mb-3 mt-8 text-center text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-stone-400">
                        {todaySectionFormulasSubtitle}
                      </h3>
                    )}
                    <ul
                      className={`space-y-6 ${hasDishes && !showSubtitles ? "mt-8" : ""}`}
                      role="list"
                    >
                      {snapshot.formulas!.map((formula) => {
                        const name = getLocalizedText(formula.nameFr, formula.nameEn, locale);
                        const desc = getLocalizedText(
                          formula.descriptionFr,
                          formula.descriptionEn,
                          locale,
                        );
                        return (
                          <li key={formula.id} className="text-center">
                            <div className="flex items-baseline justify-center gap-3">
                              <span className="font-serif text-lg">{name}</span>
                              <span
                                className="text-sm font-semibold tabular-nums"
                                style={{ color: "var(--brand-accent, #fbbf24)" }}
                              >
                                {formatPrice(formula.priceCents, locale)}
                              </span>
                            </div>
                            {desc && (
                              <p className="mt-1 whitespace-pre-line text-sm italic text-stone-500">
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

        <div className="space-y-12">
          {snapshot.categories.map((category) => (
            <section key={category.name}>
              <h2
                className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.3em]"
                style={{ color: "var(--brand-accent, #fbbf24)" }}
              >
                {category.name}
              </h2>
              <ul className="space-y-8" role="list">
                {category.items.map((item, index) => (
                  <ElegantItemRow
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
          <section
            className="mt-16 rounded-md border bg-stone-900/40 p-5 text-stone-300"
            style={{
              borderColor: "color-mix(in srgb, var(--brand-accent, #fbbf24) 20%, transparent)",
            }}
          >
            <h2
              className="mb-3 text-xs font-semibold uppercase tracking-[0.25em]"
              style={{ color: "var(--brand-accent, #fbbf24)" }}
            >
              {allergenLegendTitle}
            </h2>
            <ul className="grid grid-cols-1 gap-x-3 gap-y-1.5 text-sm sm:grid-cols-2">
              {Array.from(presentAllergens).map((a) => (
                <li key={a} className="text-stone-300">
                  · {allergenLabels[a].legal}
                </li>
              ))}
            </ul>
          </section>
        )}

        {showWatermark && watermarkText && (
          <div className="mt-12 text-center text-xs text-stone-500">{watermarkText}</div>
        )}
      </main>
      {/* Watermark legacy non utilisée ici (rendu custom au-dessus pour rester cohérent dark)
          mais on l'importe pour préserver la signature en cas d'évolution. */}
      <noscript>{showWatermark && watermarkText && <Watermark text={watermarkText} />}</noscript>
    </div>
  );
}

type ItemRowProps = {
  item: PublicMenuItem;
  locale: "fr" | "en";
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  allergenLabels: AllergenLabels;
  allergenSectionLabel: string;
  priority?: boolean;
};

function ElegantItemRow({
  item,
  locale,
  badgeLabels,
  allergenLabels,
  allergenSectionLabel,
  priority = false,
}: ItemRowProps) {
  const name = getLocalizedText(item.nameFr, item.nameEn, locale);
  const description = getLocalizedText(item.descriptionFr, item.descriptionEn, locale);
  const imageUrl = item.imagePath ? itemImageUrl(item.imagePath) : null;
  const altText = getLocalizedText(item.altTextFr, item.altTextEn, locale) || name;

  return (
    <li className="space-y-3">
      {imageUrl && (
        <div
          className="relative aspect-[21/9] w-full overflow-hidden rounded-sm ring-1"
          style={{
            // Tailwind `ring-amber-400/20` historique → 20% opacité.
            // `color-mix` permet de garder l'effet en gardant la CSS var brandable.
            boxShadow:
              "inset 0 0 0 1px color-mix(in srgb, var(--brand-accent, #fbbf24) 20%, transparent)",
          }}
        >
          <Image
            src={imageUrl}
            alt={altText}
            fill
            sizes="(min-width: 768px) 672px, 100vw"
            className="object-cover"
            priority={priority}
          />
        </div>
      )}
      <div className="flex items-baseline justify-between gap-4 border-b border-stone-800 pb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <span className="text-lg italic">{name}</span>
            {item.badge !== "NONE" && (
              <span
                className="text-[0.65rem] font-semibold uppercase tracking-[0.2em]"
                style={{ color: "var(--brand-accent, #fbbf24)" }}
              >
                {badgeLabels[item.badge]}
              </span>
            )}
          </div>
        </div>
        <span
          className="shrink-0 text-base font-semibold tabular-nums"
          style={{ color: "var(--brand-accent, #fbbf24)" }}
          aria-label={formatPriceAria(item.priceCents, locale)}
        >
          {formatPrice(item.priceCents, locale)}
        </span>
      </div>
      {description && (
        <p className="text-sm italic leading-relaxed text-stone-400">{description}</p>
      )}
      {item.allergens.length > 0 && (
        <AllergenIcons
          allergens={item.allergens}
          labels={allergenLabels}
          listLabel={allergenSectionLabel}
          className="opacity-70"
        />
      )}
    </li>
  );
}
