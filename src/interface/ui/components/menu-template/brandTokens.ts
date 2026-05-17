/**
 * Tokens de couleurs S2.4. Les templates consomment `var(--brand-*, fallback)`
 * via Tailwind arbitrary values pour préserver leur identité par défaut quand
 * le restaurateur n'a rien customisé. Les fallbacks reflètent les palettes
 * historiques de chaque template (amber pour Elegant, orange pour Modern, etc.).
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
