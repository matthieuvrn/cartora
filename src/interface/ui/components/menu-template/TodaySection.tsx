import type { PublicMenuDailyDish, PublicMenuFormula } from "@/domain/menu/PublicMenuTypes";
import { formatPrice } from "@/domain/menu/publicMenuView";
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
  description?: string;
  /**
   * Sous-titres optionnels. Rendus UNIQUEMENT si plats du jour ET formules sont
   * tous deux présents — pour distinguer visuellement deux types d'offres dans
   * la même section. Si un seul des deux est présent, le titre principal "Aujourd'hui"
   * suffit (pas de bruit visuel).
   */
  dishesSubtitle?: string;
  formulasSubtitle?: string;
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  allergenLabels: AllergenLabels;
  allergenSectionLabel: string;
};

/**
 * Section "Aujourd'hui" (S3.1) — rendue en tête de chaque template public, avant
 * les catégories régulières. Les items sont déjà filtrés par expiration côté
 * `GetPublicMenu` (Clock injecté), donc on rend tels quels.
 *
 * Volontairement minimaliste : on réutilise `MenuItemRow` pour rester cohérent avec
 * les catégories (typo, prix, badge, allergens, photo). Le distinguo visuel passe
 * uniquement par l'emplacement (en tête) + le titre + la couleur primaire de marque.
 */
export function TodaySection({
  items,
  formulas = [],
  locale,
  sourceLocale,
  title,
  description,
  dishesSubtitle,
  formulasSubtitle,
  badgeLabels,
  allergenLabels,
  allergenSectionLabel,
}: Props) {
  if (items.length === 0 && formulas.length === 0) return null;

  const showSubtitles = items.length > 0 && formulas.length > 0;

  return (
    <section aria-labelledby="daily-menu-heading" className="mb-8">
      <div className="mb-2">
        <h2 id="daily-menu-heading" className="menu-heading menu-today-title text-lg font-semibold">
          {title}
        </h2>
        {description && <p className="menu-muted text-xs">{description}</p>}
      </div>
      {items.length > 0 && (
        <>
          {showSubtitles && dishesSubtitle && (
            <h3 className="menu-muted mb-1 mt-2 text-xs font-semibold uppercase tracking-wide">
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
            <h3 className="menu-muted mb-1 mt-4 text-xs font-semibold uppercase tracking-wide">
              {formulasSubtitle}
            </h3>
          )}
          <ul
            className={`space-y-2 ${items.length > 0 && !showSubtitles ? "mt-3" : ""}`}
            role="list"
          >
            {formulas.map((formula) => {
              const name = resolveText(formula.texts.name, locale, sourceLocale);
              const description = resolveText(formula.texts.description, locale, sourceLocale);
              return (
                <li key={formula.id} className="menu-card rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="menu-item-name font-medium">{name}</h3>
                    <span className="menu-price shrink-0 text-sm font-semibold tabular-nums">
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
