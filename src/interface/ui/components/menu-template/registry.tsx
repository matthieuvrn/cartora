import type { ComponentType } from "react";
import type { MenuTemplate } from "@/domain/menu/MenuTypes";
import {
  BISTRO_FALLBACK,
  CARTORA_FALLBACK,
  CLASSIC_FALLBACK,
  NEON_FALLBACK,
  NOIR_FALLBACK,
  SOLAR_FALLBACK,
  ZEN_FALLBACK,
} from "./brandTokens";
import { TemplateClassic } from "./TemplateClassic";
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
  // TODO Étapes 5-6 : remplacer `TemplateClassic` par le vrai skin de chaque template.
  // Le set d'enum est livré ici (Étape 2) ; les designs suivent (1 ligne à changer par skin).
  // Les `defaultTokens` ci-dessous sont provisoires (cf. brandTokens.ts).
  CARTORA: { component: TemplateClassic, defaultTokens: CARTORA_FALLBACK },
  BISTRO: { component: TemplateClassic, defaultTokens: BISTRO_FALLBACK },
  NOIR: { component: TemplateClassic, defaultTokens: NOIR_FALLBACK },
  SOLAR: { component: TemplateClassic, defaultTokens: SOLAR_FALLBACK },
  ZEN: { component: TemplateClassic, defaultTokens: ZEN_FALLBACK },
  NEON: { component: TemplateClassic, defaultTokens: NEON_FALLBACK },
};
