import { TemplateLogo } from "./TemplateLogo";
import { categoryAnchorId, collectPresentAllergens } from "@/domain/menu/publicMenuView";
import { resolveText } from "@/domain/menu/MenuLocale";
import { restaurantLogoUrl } from "@/lib/storage-url";
import { MenuCategorySection } from "./MenuCategorySection";
import { TodaySection } from "./TodaySection";
import { Watermark } from "./Watermark";
import { AllergenLegend } from "../AllergenLegend";
import type { MenuTemplateProps } from "./types";

/**
 * Template "Classique" — rendu par défaut, disponible sur tous les tiers. Refonte « tech N&B
 * 2026 » (Étape 5) : en-tête sticky compact, nav rapide par catégorie (ancres), titres de
 * catégorie en capitales filetées, prix en JetBrains Mono. Lit ses couleurs via le contrat
 * `--menu-*` (cf. globals.css) ; SEUL template `supportsColorCustomization` → `BrandingStyleScope`
 * (index.tsx) réinjecte `--brand-*` → `--menu-*` via `.menu-branded`. Couche headless `publicMenuView`.
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
  categoriesNavLabel,
}: MenuTemplateProps) {
  // Légende INCO partagée (items + plats du jour). Logique factorisée + testée en domaine.
  const presentAllergens = collectPresentAllergens(snapshot);

  const logoUrl = snapshot.restaurantLogoPath
    ? restaurantLogoUrl(snapshot.restaurantLogoPath)
    : null;

  // Seules les catégories non vides rendent (cf. MenuCategorySection) → la nav rapide ne liste
  // qu'elles, et ne s'affiche qu'au-delà d'une seule (un seul lien d'ancre serait inutile).
  const visibleCategories = snapshot.categories.filter((c) => c.items.length > 0);
  const showNav = visibleCategories.length > 1;

  const hasToday =
    (snapshot.dailyItems && snapshot.dailyItems.length > 0) ||
    (snapshot.formulas && snapshot.formulas.length > 0);

  return (
    <main
      className="menu-root mx-auto max-w-lg pb-12"
      aria-label={`Menu de ${snapshot.restaurantName}`}
    >
      <header
        className="sticky top-0 z-10 border-b px-4 py-3 sm:px-6"
        style={{ backgroundColor: "var(--menu-bg)", borderColor: "var(--menu-border)" }}
      >
        <div className="flex items-center gap-3">
          {logoUrl && (
            <TemplateLogo
              src={logoUrl}
              alt={snapshot.restaurantName}
              className="h-10 w-10 shrink-0"
              sizes="40px"
              priority
            />
          )}
          <h1 className="menu-heading truncate text-xl font-bold tracking-tight">
            {snapshot.restaurantName}
          </h1>
        </div>
        {showNav && (
          <nav
            aria-label={categoriesNavLabel}
            className="-mx-4 mt-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6"
          >
            <ul className="flex gap-4 whitespace-nowrap" role="list">
              {visibleCategories.map((category) => (
                <li key={category.name}>
                  <a
                    href={`#${categoryAnchorId(category.name)}`}
                    className="menu-muted text-xs font-medium uppercase tracking-wide hover:underline"
                  >
                    {resolveText(category.texts.name, locale, snapshot.sourceLocale) ||
                      category.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <div className="px-4 pt-6 sm:px-6">
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
        <div className="space-y-8">
          {snapshot.categories.map((category) => (
            <MenuCategorySection
              sourceLocale={snapshot.sourceLocale}
              key={category.name}
              id={categoryAnchorId(category.name)}
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
      </div>
    </main>
  );
}
