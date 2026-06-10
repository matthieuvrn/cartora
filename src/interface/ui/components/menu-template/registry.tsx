import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { MenuTemplate } from "@/domain/menu/MenuTypes";
import {
  BISTRO_FALLBACK,
  CARTORA_FALLBACK,
  CLASSIC_FALLBACK,
  NEON_FALLBACK,
  NOIR_FALLBACK,
  RIVAGE_FALLBACK,
  SOLAR_FALLBACK,
  VELOURS_FALLBACK,
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
const TemplateCartora = lazyTemplate(() =>
  import("./TemplateCartora").then((m) => m.TemplateCartora),
);
const TemplateBistro = lazyTemplate(() => import("./TemplateBistro").then((m) => m.TemplateBistro));
const TemplateNoir = lazyTemplate(() => import("./TemplateNoir").then((m) => m.TemplateNoir));
const TemplateSolar = lazyTemplate(() => import("./TemplateSolar").then((m) => m.TemplateSolar));
const TemplateZen = lazyTemplate(() => import("./TemplateZen").then((m) => m.TemplateZen));
const TemplateNeon = lazyTemplate(() => import("./TemplateNeon").then((m) => m.TemplateNeon));
const TemplateRivage = lazyTemplate(() => import("./TemplateRivage").then((m) => m.TemplateRivage));
const TemplateVelours = lazyTemplate(() =>
  import("./TemplateVelours").then((m) => m.TemplateVelours),
);

export const TEMPLATE_REGISTRY: Record<MenuTemplate, TemplateRegistryEntry> = {
  CLASSIC: { component: TemplateClassic, defaultTokens: CLASSIC_FALLBACK },
  CARTORA: { component: TemplateCartora, defaultTokens: CARTORA_FALLBACK },
  // Premium (Étape 6) — 1 skin art-dirigé par entrée, chacun dans son chunk client (cf. docblock).
  BISTRO: { component: TemplateBistro, defaultTokens: BISTRO_FALLBACK },
  NOIR: { component: TemplateNoir, defaultTokens: NOIR_FALLBACK },
  SOLAR: { component: TemplateSolar, defaultTokens: SOLAR_FALLBACK },
  ZEN: { component: TemplateZen, defaultTokens: ZEN_FALLBACK },
  NEON: { component: TemplateNeon, defaultTokens: NEON_FALLBACK },
  // Set 2026.1 — light froid (bord de mer) + dark chaud (bar à vin).
  RIVAGE: { component: TemplateRivage, defaultTokens: RIVAGE_FALLBACK },
  VELOURS: { component: TemplateVelours, defaultTokens: VELOURS_FALLBACK },
};
