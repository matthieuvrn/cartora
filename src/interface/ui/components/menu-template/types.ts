import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import type { MenuLocale } from "@/domain/menu/MenuLocale";
import type { AllergenLabels } from "../AllergenIcons";

/**
 * Contrat commun à tous les templates de rendu public. Chaque template est
 * interchangeable côté `MenuTemplateRenderer` / `PublicMenuClient` : même props,
 * un seul `snapshot`, des labels i18n déjà résolus côté page (server component).
 *
 * Centralisé ici (et non plus redéclaré à l'identique dans chaque `Template*.tsx`)
 * pour qu'un nouveau skin n'ait qu'à `(props: MenuTemplateProps)`.
 */
export type MenuTemplateProps = {
  snapshot: PublicMenuSnapshot;
  locale: MenuLocale;
  showWatermark?: boolean;
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  allergenLabels: AllergenLabels;
  allergenSectionLabel: string;
  allergenLegendTitle: string;
  watermarkText?: string;
  /** Titre de la section "Aujourd'hui" (S3.1 + S3.2) — i18n résolu côté page. */
  todaySectionTitle: string;
  todaySectionDescription?: string;
  /**
   * Sous-titres affichés UNIQUEMENT si plats du jour ET formules coexistent.
   * Si l'un des deux manque, le titre principal "Aujourd'hui" suffit.
   */
  todaySectionDishesSubtitle?: string;
  todaySectionFormulasSubtitle?: string;
  /**
   * Nom accessible de la nav rapide par catégorie (CLASSIC). Optionnel : un skin sans
   * nav (ex. CARTORA, éditorial) l'ignore simplement.
   */
  categoriesNavLabel?: string;
};
