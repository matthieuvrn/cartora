import type { PublicMenuDailyItem } from "@/domain/menu/PublicMenuTypes";
import type { AllergenLabels } from "../AllergenIcons";
import { MenuItemRow } from "./MenuItemRow";

type Props = {
  items: PublicMenuDailyItem[];
  locale: "fr" | "en";
  title: string;
  description?: string;
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
export function DailyMenuSection({
  items,
  locale,
  title,
  description,
  badgeLabels,
  allergenLabels,
  allergenSectionLabel,
}: Props) {
  if (items.length === 0) return null;

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
    </section>
  );
}
