import type { ComponentType } from "react";
import type { MenuTemplate } from "@/domain/menu/MenuTypes";
import { CLASSIC_FALLBACK, ELEGANT_FALLBACK, MODERN_FALLBACK } from "./brandTokens";
import { TemplateClassic } from "./TemplateClassic";
import { TemplateElegant } from "./TemplateElegant";
import { TemplateModern } from "./TemplateModern";
import type { MenuTemplateProps } from "./types";

/**
 * Registry **interface** des templates : tout ce qui est React/visuel (composant de
 * rendu, palette d'aperçu). Vit côté interface car il référence des composants React ;
 * il importe le meta **domaine** (`MenuTemplateMeta` — tier, customisation couleurs,
 * i18nKey), jamais l'inverse, pour respecter la frontière `domain → interface`.
 *
 * Source unique du dispatcher (`MenuTemplateRenderer`). Objectif anti-maintenance :
 * ajouter un template = 1 skin + 1 entrée ici (+ 1 entrée meta côté domaine), sans
 * toucher de `switch`.
 *
 * ⚠ Perf : ce record force le bundling de TOUS les composants importés dans tout
 * module client qui le charge (`PublicMenuClient` est `"use client"`). À 3 templates
 * = statu quo ; en montant à 7, prévoir un code-split (`next/dynamic` par entrée, ou
 * dispatch en Server Component — le `"use client"` ne sert qu'au toggle de langue).
 */
export type TemplateDefaultTokens = { primary: string; accent: string; bg: string };

export type TemplateRegistryEntry = {
  component: ComponentType<MenuTemplateProps>;
  /** Palette représentative pour vignettes / sélecteur (cf. `brandTokens.ts`). */
  defaultTokens: TemplateDefaultTokens;
};

export const TEMPLATE_REGISTRY: Record<MenuTemplate, TemplateRegistryEntry> = {
  CLASSIC: { component: TemplateClassic, defaultTokens: CLASSIC_FALLBACK },
  ELEGANT: { component: TemplateElegant, defaultTokens: ELEGANT_FALLBACK },
  MODERN: { component: TemplateModern, defaultTokens: MODERN_FALLBACK },
};
