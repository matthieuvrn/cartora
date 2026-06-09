/**
 * Dispatcher de rendu public du menu, piloté par le registry.
 *
 * Le composant à rendre est résolu via `TEMPLATE_REGISTRY[template]` (interface) et
 * le comportement de marque via `TEMPLATE_META[template]` (domaine). Ajouter un
 * template ne touche plus ce fichier : 1 entrée registry + 1 entrée meta suffisent.
 *
 * Sous-composants partagés (Watermark, AllergenIcons/Legend) + couche « headless »
 * (`@/domain/menu/publicMenuView` : labels locale, allergènes, priorité LCP, prix)
 * sont factorisés — un skin n'a plus à les redupliquer.
 */
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import { TEMPLATE_META } from "@/domain/menu/MenuTemplateMeta";
import { TEMPLATE_REGISTRY } from "./registry";
import type { MenuTemplateProps } from "./types";

// ⚠ NE PAS ré-exporter les composants `Template*` / sous-composants de skin ici : ce barrel
// est dans le bundle client (PublicMenuClient, MenuPreviewPane). Un seul `export { TemplateX }`
// statique ré-agrège le skin dans le chunk principal et annule le code-split du registry.
// Les skins se chargent UNIQUEMENT via `next/dynamic` dans registry.tsx. Seuls des éléments
// légers/partagés transitent par ce barrel.
export { TrackingBeacon } from "./TrackingBeacon";
export type { MenuTemplateProps } from "./types";

const DEFAULT_TEMPLATE = "CLASSIC" as const;

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

/**
 * Résout le template du snapshot via le registry. Repli `CLASSIC` pour les snapshots
 * legacy (pré-S2.2, sans `template`) ET pour toute valeur d'enum inconnue d'un JSON
 * ancien (filet de sécurité côté renderer — cf. plan migration). Les couleurs de
 * marque ne sont appliquées qu'aux templates `supportsColorCustomization` (Classic) ;
 * les templates art-dirigés ignorent `--brand-*` et gardent leur palette figée.
 */
export function MenuTemplateRenderer(props: MenuTemplateProps) {
  const requested = props.snapshot.template;
  const template = requested && requested in TEMPLATE_REGISTRY ? requested : DEFAULT_TEMPLATE;

  const Template = TEMPLATE_REGISTRY[template].component;
  const content = <Template {...props} />;

  // `data-template` active les tokens figés du skin (polices + palette art-dirigée) déclarés
  // en CSS scopée — cf. globals.css `[data-template="X"]`. Wrapper neutre (display:block,
  // pleine largeur) : le `mx-auto max-w-lg` du skin centre toujours, aucune régression layout.
  // Seul CLASSIC (supportsColorCustomization) lit les couleurs de marque via BrandingStyleScope.
  const inner =
    TEMPLATE_META[template].supportsColorCustomization && props.snapshot.branding ? (
      <BrandingStyleScope branding={props.snapshot.branding}>{content}</BrandingStyleScope>
    ) : (
      content
    );

  return <div data-template={template}>{inner}</div>;
}
