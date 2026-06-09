import dynamic from "next/dynamic";
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
 * ── Code-splitting (obligatoire) ────────────────────────────────────────────
 * Chaque skin est chargé via `next/dynamic` → son PROPRE chunk client. `ssr` reste à
 * `true` (défaut) : le HTML du menu est rendu côté serveur (LCP/SEO préservés), seul le
 * chunk du template effectivement RENDU est fetché à l'hydratation. Conséquence : un
 * menu public ne télécharge JAMAIS le JS des N-1 autres templates — indispensable en
 * montant vers 20-30 templates (page la plus scannée, souvent en 4G au resto).
 *
 * ⚠ Ne JAMAIS importer un `Template*` en **statique** ici (ni le ré-exporter depuis
 * `index.tsx`) : un seul chemin d'import statique depuis le bundle client ré-agrège le
 * composant dans le chunk principal et annule le split. Ajouter un skin =
 *   `const TemplateX = lazyTemplate(() => import("./TemplateX").then((m) => m.TemplateX));`
 * puis pointer l'entrée correspondante dessus. `defaultTokens` reste statique (objet de
 * couleurs minuscule, lu par le sélecteur/vignettes sans charger aucun chunk de skin).
 */
export type TemplateDefaultTokens = { primary: string; accent: string; bg: string };

export type TemplateRegistryEntry = {
  component: ComponentType<MenuTemplateProps>;
  /** Palette représentative pour vignettes / sélecteur (cf. `brandTokens.ts`). */
  defaultTokens: TemplateDefaultTokens;
};

/** Charge un skin en chunk dédié (named export → composant). Voir docblock ci-dessus. */
const lazyTemplate = (
  loader: () => Promise<ComponentType<MenuTemplateProps>>,
): ComponentType<MenuTemplateProps> => dynamic(loader);

const TemplateClassic = lazyTemplate(() =>
  import("./TemplateClassic").then((m) => m.TemplateClassic),
);

export const TEMPLATE_REGISTRY: Record<MenuTemplate, TemplateRegistryEntry> = {
  CLASSIC: { component: TemplateClassic, defaultTokens: CLASSIC_FALLBACK },
  // TODO Étapes 5-6 : remplacer `TemplateClassic` par le vrai skin de chaque template
  // (1 `lazyTemplate(() => import("./TemplateX")…)` + pointer l'entrée dessus → split auto).
  // Les `defaultTokens` ci-dessous sont provisoires (cf. brandTokens.ts).
  CARTORA: { component: TemplateClassic, defaultTokens: CARTORA_FALLBACK },
  BISTRO: { component: TemplateClassic, defaultTokens: BISTRO_FALLBACK },
  NOIR: { component: TemplateClassic, defaultTokens: NOIR_FALLBACK },
  SOLAR: { component: TemplateClassic, defaultTokens: SOLAR_FALLBACK },
  ZEN: { component: TemplateClassic, defaultTokens: ZEN_FALLBACK },
  NEON: { component: TemplateClassic, defaultTokens: NEON_FALLBACK },
};
