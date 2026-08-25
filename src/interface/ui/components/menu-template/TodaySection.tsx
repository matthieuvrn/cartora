import type { PublicMenuDailyDish, PublicMenuFormula } from "@/domain/menu/PublicMenuTypes";
import {
  formatPrice,
  formatPriceAria,
  TODAY_SECTION_ANCHOR_ID,
} from "@/domain/menu/publicMenuView";
import { resolveText, type MenuLocale } from "@/domain/menu/MenuLocale";
import type { AllergenLabels } from "../AllergenIcons";
import { MenuItemRow } from "./MenuItemRow";

type Props = {
  items: PublicMenuDailyDish[];
  formulas?: PublicMenuFormula[];
  locale: MenuLocale;
  /** Langue source du menu — dernier repli de `resolveText` (S4). */
  sourceLocale: MenuLocale;
  title: string;
  /**
   * Sous-titres optionnels. Rendus UNIQUEMENT si plats du jour ET formules sont
   * tous deux présents — pour distinguer deux types d'offres dans le même panneau.
   * Si un seul des deux est présent, le titre du panneau suffit (pas de bruit visuel).
   */
  dishesSubtitle?: string;
  formulasSubtitle?: string;
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  allergenLabels: AllergenLabels;
  allergenSectionLabel: string;
};

/**
 * Section "Aujourd'hui" (S3.1, refonte « ardoise » 2026) — rendue en tête de chaque
 * template public, avant les catégories régulières. Les items sont déjà filtrés par
 * expiration côté `GetPublicMenu` (Clock injecté), donc on rend tels quels.
 *
 * L'éphémère est BORNÉ : un panneau `.menu-today` (tokens `--menu-today-*` avec repli
 * sur `--menu-surface`/`--menu-border`/`--menu-accent`, cf. globals.css) sépare
 * l'ardoise du jour de la carte permanente — le distinguo ne repose plus sur le seul
 * emplacement. À l'intérieur, UN langage : les plats réutilisent `MenuItemRow` et les
 * formules sont des rangées filetées (même grille nom/prix), pas des cartes imbriquées ;
 * leur prix — l'offre phare — est le plus gros chiffre du bloc (text-base vs text-sm).
 * Le panneau porte l'ancre `#aujourdhui` (nav rapide des templates, scroll-mt sticky).
 */
export function TodaySection({
  items,
  formulas = [],
  locale,
  sourceLocale,
  title,
  dishesSubtitle,
  formulasSubtitle,
  badgeLabels,
  allergenLabels,
  allergenSectionLabel,
}: Props) {
  if (items.length === 0 && formulas.length === 0) return null;

  const showSubtitles = items.length > 0 && formulas.length > 0;

  return (
    <section
      id={TODAY_SECTION_ANCHOR_ID}
      aria-labelledby="daily-menu-heading"
      className="menu-today mb-10 scroll-mt-24 rounded-lg border p-4 sm:p-5"
    >
      <h2
        id="daily-menu-heading"
        className="menu-heading menu-today-title mb-2 text-lg font-semibold"
      >
        {title}
      </h2>
      {items.length > 0 && (
        <>
          {showSubtitles && dishesSubtitle && (
            <h3 className="menu-today-kicker mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wider">
              {dishesSubtitle}
            </h3>
          )}
          <ul className="menu-divide divide-y" role="list">
            {items.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                locale={locale}
                sourceLocale={sourceLocale}
                badgeLabels={badgeLabels}
                allergenLabels={allergenLabels}
                allergenSectionLabel={allergenSectionLabel}
              />
            ))}
          </ul>
        </>
      )}
      {formulas.length > 0 && (
        <>
          {showSubtitles && formulasSubtitle && (
            <h3 className="menu-today-kicker mb-1 mt-5 text-[11px] font-semibold uppercase tracking-wider">
              {formulasSubtitle}
            </h3>
          )}
          <ul className="menu-divide divide-y" role="list">
            {formulas.map((formula) => {
              const name = resolveText(formula.texts.name, locale, sourceLocale);
              const description = resolveText(formula.texts.description, locale, sourceLocale);
              return (
                <li key={formula.id} className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="menu-item-name font-medium">{name}</h3>
                    <span
                      className="menu-price shrink-0 text-base font-semibold tabular-nums"
                      aria-label={formatPriceAria(formula.priceCents, locale)}
                    >
                      {formatPrice(formula.priceCents, locale)}
                    </span>
                  </div>
                  {description && (
                    <p className="menu-muted mt-1 whitespace-pre-line text-sm">{description}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
