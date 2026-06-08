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
  CLASSIC: { requiredTier: "FREE", supportsColorCustomization: true, i18nKey: "CLASSIC" },
  ELEGANT: { requiredTier: "PRO", supportsColorCustomization: false, i18nKey: "ELEGANT" },
  MODERN: { requiredTier: "PRO", supportsColorCustomization: false, i18nKey: "MODERN" },
};

/** Le template applique-t-il les couleurs de marque du restaurateur ? */
export function supportsColorCustomization(template: MenuTemplate): boolean {
  return TEMPLATE_META[template].supportsColorCustomization;
}
