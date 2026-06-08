/**
 * Tokens de couleurs S2.4 — palette **représentative** de chaque template, exposée
 * via le registry (`registry.tsx` → `defaultTokens`) pour les vignettes / sélecteur.
 *
 * ⚠ Ce ne sont PAS forcément les replis CSS littéraux des templates legacy : Classic
 * rend en réalité sur `currentColor`/`transparent` (il hérite), tandis qu'Elegant
 * (#fbbf24 / #0c0a09) et Modern (#ea580c / #fff7ed) hardcodent ces hex inline via
 * `var(--brand-*, <hex>)`. L'unification repli↔token se fera quand les skins seront
 * reconstruits (Étapes 5–6) ; ici ces valeurs servent de métadonnée d'aperçu.
 */

export const CLASSIC_FALLBACK = {
  primary: "#0f172a", // slate-900
  accent: "#0ea5e9", // sky-500
  bg: "#ffffff",
} as const;

export const ELEGANT_FALLBACK = {
  primary: "#fbbf24", // amber-400 — titres + accents (sur fond sombre)
  accent: "#fbbf24",
  bg: "#0c0a09", // stone-950
} as const;

export const MODERN_FALLBACK = {
  primary: "#ea580c", // orange-600 — titres + accents
  accent: "#ea580c",
  bg: "#fff7ed", // orange-50
} as const;
