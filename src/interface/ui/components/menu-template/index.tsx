/**
 * Templates de rendu public du menu.
 *
 * 3 designs distincts, sélectionnés via `Menu.template` (enum `MenuTemplate`) et
 * gatés par tier via `PlanPolicy.canUseTemplate`. Chaque template expose la même
 * interface (`{ snapshot, locale, showWatermark, badgeLabels, allergenLabels, … }`)
 * pour rester interchangeable côté `PublicMenuClient`.
 *
 * ⚠️ MAINTENANCE × 3 — décision produit S2.2 actée :
 * À chaque évolution du modèle public (allergens, photos, formules, daily menu,
 * branding…), penser à propager la feature dans les 3 templates. Tout
 * sous-composant partagé (Watermark, AllergenIcons, AllergenLegend) reste
 * factorisé ; tout layout structurel ou stylé spécifique vit dans son template.
 */
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import type { AllergenLabels } from "../AllergenIcons";
import { TemplateClassic } from "./TemplateClassic";
import { TemplateElegant } from "./TemplateElegant";
import { TemplateModern } from "./TemplateModern";

export { TemplateClassic } from "./TemplateClassic";
export { TemplateElegant } from "./TemplateElegant";
export { TemplateModern } from "./TemplateModern";
export { MenuCategorySection } from "./MenuCategorySection";
export { MenuItemRow } from "./MenuItemRow";
export { TrackingBeacon } from "./TrackingBeacon";
export { Watermark } from "./Watermark";
export { DailyMenuSection } from "./DailyMenuSection";

type RendererProps = {
  snapshot: PublicMenuSnapshot;
  locale: "fr" | "en";
  showWatermark?: boolean;
  badgeLabels: Record<"NEW" | "POPULAR", string>;
  allergenLabels: AllergenLabels;
  allergenSectionLabel: string;
  allergenLegendTitle: string;
  watermarkText?: string;
  /** Titre de la section "Aujourd'hui" (S3.1) — i18n résolu côté page. */
  dailyMenuTitle: string;
  dailyMenuDescription?: string;
};

/**
 * Injecte les CSS custom properties de branding (S2.4) sur un wrapper local.
 * Trois variables consommées par les templates via `var(--brand-*, <fallback>)`
 * — quand absentes, chaque template applique sa palette par défaut.
 *
 * `style-src 'unsafe-inline'` est déjà autorisé dans le CSP (cf. next.config.ts).
 * L'objet `style` React encode automatiquement les valeurs — pas d'injection HTML.
 */
function BrandingStyleScope({
  branding,
  children,
}: {
  branding: PublicMenuSnapshot["branding"];
  children: React.ReactNode;
}) {
  if (!branding) return <>{children}</>;
  const style: React.CSSProperties = {};
  const styleAsRecord = style as Record<string, string>;
  if (branding.primary) styleAsRecord["--brand-primary"] = branding.primary;
  if (branding.accent) styleAsRecord["--brand-accent"] = branding.accent;
  if (branding.background) styleAsRecord["--brand-bg"] = branding.background;
  return <div style={style}>{children}</div>;
}

// Composant dispatcher (pas une fonction qui retourne un composant) pour
// satisfaire `react-hooks/static-components` — les références aux Template*
// restent statiques au site d'appel. Fallback CLASSIC pour les snapshots legacy
// (pré-S2.2) sans champ `template` ; le défaut est aussi appliqué côté DB via
// `template @default(CLASSIC)`.
export function MenuTemplateRenderer(props: RendererProps) {
  const branding = props.snapshot.branding;
  switch (props.snapshot.template) {
    case "ELEGANT":
      return (
        <BrandingStyleScope branding={branding}>
          <TemplateElegant {...props} />
        </BrandingStyleScope>
      );
    case "MODERN":
      return (
        <BrandingStyleScope branding={branding}>
          <TemplateModern {...props} />
        </BrandingStyleScope>
      );
    case "CLASSIC":
    default:
      return (
        <BrandingStyleScope branding={branding}>
          <TemplateClassic {...props} />
        </BrandingStyleScope>
      );
  }
}
