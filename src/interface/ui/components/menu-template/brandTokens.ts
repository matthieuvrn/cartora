/**
 * Tokens de couleurs — palette **représentative** de chaque template, exposée via le
 * registry (`registry.tsx` → `defaultTokens`) pour les vignettes / sélecteur.
 *
 * Pour les 6 templates du set 2026 (CARTORA + 5 premium) ces palettes sont désormais **figées**
 * (skins livrés, Étapes 5–6) et reflètent les `--tpl-*` de rendu. CLASSIC reste le seul template
 * `supportsColorCustomization` (couleurs surchargeables par le restaurateur) — son token n'est
 * qu'une palette d'aperçu représentative.
 *
 * ⚠ DUPLICATION VOLONTAIRE : les mêmes hex sont déclarés en tokens de rendu CSS dans
 * `src/app/globals.css` (`[data-template="X"]` → `--tpl-*`). Garder les deux en phase tant que
 * rendu et aperçu ne consomment pas une source unique. Ici = aperçu (vignettes/sélecteur) ; là = rendu.
 */

export const CLASSIC_FALLBACK = {
  primary: "#0f172a", // slate-900
  accent: "#0ea5e9", // sky-500
  bg: "#ffffff",
} as const;

// --- Set 2026 (figé — miroir des `--tpl-*` de globals.css, cf. DA dans docs/publicmenu.md) ---

export const CARTORA_FALLBACK = {
  primary: "#1f3d2f", // sapin
  accent: "#2b6a6a", // canard
  bg: "#f5efe6", // sand
} as const;

export const BISTRO_FALLBACK = {
  primary: "#6b2330", // bordeaux
  accent: "#b08d57", // laiton
  bg: "#f7f1e6", // ivoire crème
} as const;

export const NOIR_FALLBACK = {
  primary: "#d9c38a", // champagne (sur fond charbon)
  accent: "#c9a24b", // or
  bg: "#14110f", // charbon quasi-noir
} as const;

export const SOLAR_FALLBACK = {
  primary: "#f4502e", // corail saturé
  accent: "#f5a623", // ambre
  bg: "#fff7ed", // crème chaud
} as const;

export const ZEN_FALLBACK = {
  primary: "#5c5248", // greige sombre
  accent: "#b5765a", // terracotta sourd
  bg: "#efeae2", // greige clair
} as const;

export const NEON_FALLBACK = {
  primary: "#22d3ee", // néon cyan (sur fond nuit)
  accent: "#e64bd0", // néon magenta
  bg: "#0a0a14", // nuit profond
} as const;
