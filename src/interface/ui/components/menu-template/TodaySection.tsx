import type { PublicMenuDailyDish, PublicMenuFormula } from "@/domain/menu/PublicMenuTypes";
import { formatPrice, getLocalizedText } from "@/domain/menu/publicMenuView";
import type { AllergenLabels } from "../AllergenIcons";
import { MenuItemRow } from "./MenuItemRow";

type Props = {
  items: PublicMenuDailyDish[];
  formulas?: PublicMenuFormula[];
  locale: "fr" | "en";
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
        <h2
          id="daily-menu-heading"
          className="text-lg font-semibold"
          style={{ color: "var(--brand-primary, currentColor)" }}
        >
          {title}
        </h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {items.length > 0 && (
        <>
          {showSubtitles && dishesSubtitle && (
            <h3 className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {dishesSubtitle}
            </h3>
          )}
          <ul className="divide-y" role="list">
            {items.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                locale={locale}
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
            <h3 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {formulasSubtitle}
            </h3>
          )}
          <ul
            className={`space-y-2 ${items.length > 0 && !showSubtitles ? "mt-3" : ""}`}
            role="list"
          >
            {formulas.map((formula) => {
              const name = getLocalizedText(formula.nameFr, formula.nameEn, locale);
              const description = getLocalizedText(
                formula.descriptionFr,
                formula.descriptionEn,
                locale,
              );
              return (
                <li
                  key={formula.id}
                  className="rounded-md border p-3"
                  style={{ borderColor: "var(--brand-primary, currentColor)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium">{name}</h3>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatPrice(formula.priceCents, locale)}
                    </span>
                  </div>
                  {description && (
                    <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                      {description}
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
}
