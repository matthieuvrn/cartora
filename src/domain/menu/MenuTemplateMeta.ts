import type { MenuTemplate } from "./MenuTypes";

/**
 * Métadonnées **pures** par template de rendu public. Vit dans le domaine (zéro
 * React) pour pouvoir être lu par `PlanPolicy`, les use cases, les schémas zod et
 * le gating UI sans violer la frontière `domain → interface` (cf. eslint.config.mjs).
 *
 * Le registry de composants (React, `Thumbnail`, polices) vit, lui, côté interface
 * (`src/interface/ui/components/menu-template/registry.tsx`) et importe CE meta —
 * jamais l'inverse.
 *
 * `requiredTier` est volontairement le littéral `"FREE" | "PRO"` (et non `PlanTier`)
 * pour rester découplé de `PlanPolicy` et éviter tout cycle d'import futur.
 */
export type TemplateRequiredTier = "FREE" | "PRO";

export type MenuTemplateMeta = {
  /** Forfait minimum pour publier avec ce template. `"FREE"` = accessible à tous. */
  requiredTier: TemplateRequiredTier;
  /**
   * Le template lit-il les couleurs de marque (`--brand-*`) ? Si `false`, sa palette
   * est figée (art-dirigée). Seul `CLASSIC` est customisable — décision produit 2026 :
   * les couleurs ouvertes à tous sur Classic, les templates premium gardent leur DA.
   */
  supportsColorCustomization: boolean;
  /** Clé i18n (sous `Settings.template.names/descriptions`) — vaut le code d'enum. */
  i18nKey: string;
};

export const TEMPLATE_META: Record<MenuTemplate, MenuTemplateMeta> = {
  // Base — sélectionnables hors PRO. CLASSIC est le seul personnalisable en couleurs.
  // CARTORA est en `requiredTier: "FREE"` (sélectionnable par tous) ; le « payant pour
  // publier » est porté par `PlanPolicy.canPublish`, pas par le gate template.
  CLASSIC: { requiredTier: "FREE", supportsColorCustomization: true, i18nKey: "CLASSIC" },
  CARTORA: { requiredTier: "FREE", supportsColorCustomization: false, i18nKey: "CARTORA" },
  // Premium (5 designer) — palette art-dirigée figée, réservés PRO.
  BISTRO: { requiredTier: "PRO", supportsColorCustomization: false, i18nKey: "BISTRO" },
  NOIR: { requiredTier: "PRO", supportsColorCustomization: false, i18nKey: "NOIR" },
  SOLAR: { requiredTier: "PRO", supportsColorCustomization: false, i18nKey: "SOLAR" },
  ZEN: { requiredTier: "PRO", supportsColorCustomization: false, i18nKey: "ZEN" },
  NEON: { requiredTier: "PRO", supportsColorCustomization: false, i18nKey: "NEON" },
};

/** Le template applique-t-il les couleurs de marque du restaurateur ? */
export function supportsColorCustomization(template: MenuTemplate): boolean {
  return TEMPLATE_META[template].supportsColorCustomization;
}
