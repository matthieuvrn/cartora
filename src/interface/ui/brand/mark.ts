/**
 * Identité Cartora — constantes vectorielles PURES (aucun React, aucun framework) partagées par
 * tout ce qui dessine la marque : `Logo.tsx` (JSX inline, couleurs via tokens CSS), les routes de
 * métadonnées (`apple-icon.tsx`, `opengraph-image.tsx` — satori consomme les helpers *Svg() en
 * data-URI), `global-error.tsx` (hors tree Next) et le filigrane des menus FREE.
 *
 * Le mark « Point final » : une carte (superellipse n = 5 portrait 19 × 22, canard) portant un C
 * TYPOGRAPHIQUE en contre-forme — dos rond, contre-œil décentré (modulation), deux bras carrés à
 * terminaisons verticales, le bras supérieur plus long que l'inférieur (asymétrie d'un C de serif,
 * écho au C Fraunces). Le panel a rejeté deux constructions : coupes radiales (« Pac-Man ») et
 * anneau à fente horizontale symétrique (= le mark Coinbase). L'initiale comme un sceau,
 * suivie de son point corail posé sur sa ligne de base — « C. », la ponctuation d'une phrase :
 * « Votre carte. Point. » (carte = le produit, point = l'instant, « à la seconde »). Le point à
 * droite (pas au coin) ne se lit jamais comme un badge de notification/présence (vérifié sur
 * une barre d'onglets simulée, 2026-09-06). Limite assumée : à 16 px le C (parois 1,3 px) n'est
 * plus qu'une encoche claire — la silhouette carte + point reste la vraie lecture favicon. Le point est celui de l'eyebrow `● Cartora` déjà en
 * production ; le corail reste l'unique climax (≈ 10 % de la surface du mark).
 * Le wordmark (Fraunces outliné) et le lockup vivent dans `./wordmark.ts`, SÉPARÉS à dessein :
 * `global-error.tsx` (chunk client préchargé sur toutes les pages) n'importe que ce fichier-ci,
 * les ~2,4 Ko gz de tracés du wordmark ne doivent jamais entrer dans le bundle initial.
 *
 * Fichiers DÉRIVÉS (régénérer si la géométrie change — `pnpm brand:assets`, scripts/brand-assets.ts) :
 * `src/app/icon.svg`, `src/app/favicon.ico`, `public/brand/icon-*.png`.
 */

/** Espace de dessin du mark (unités /32). */
export const BRAND_MARK_VIEWBOX = "0 0 32 32";

/**
 * Corps : la carte — superellipse n = 5, demi-axes 9,5 × 11, centre (11,9 ; 16) → x 2,4→21,4,
 * y 5→27 ; 7 cubiques par quadrant, poignées BORNÉES à la boîte (erreur radiale ≤ 0,004 u).
 * Puis le C en contre-forme (sous-chemin en sens INVERSE → trou en règle nonzero, aucun
 * fill-rule requis) : dos = demi-cercle R 6,1 centré (12,1 ; 16), les bras partent TANGENTS
 * des pôles (plats à y 9,9 / 22,1) ; contre-œil r 3 centré (12,9 ; 16) (décalé +0,8 → dos 3,9 u,
 * bras 3,1 u) ; bouche = diamètre du contre-œil (6 u, y 13→19) ; terminaisons verticales à
 * x 17,8 (bras haut) et 16 (bras bas, Δ 1,8 u : asymétrie lisible dès 32 px), bras plus courts
 * que le rayon (pas de lecture « aimant »), les QUATRE coins de terminaison adoucis r 0,7.
 * Parois carte→C : 3,6 u côtés, 4,9 u haut/bas.
 */
export const BRAND_MARK_BODY_PATH =
  "M21.4 16C21.4 20.471 21.399 21.806 21.167 23.162C21.093 23.594 20.972 24.124 20.754 24.627C20.633 24.907 20.493 25.153 20.336 25.367C20.269 25.459 20.153 25.608 19.99 25.768C19.825 25.93 19.617 26.098 19.35 26.252C18.901 26.513 18.433 26.65 18.085 26.73C16.927 26.996 15.763 27 11.9 27C8.037 27 6.873 26.996 5.715 26.73C5.367 26.65 4.899 26.513 4.45 26.252C4.183 26.098 3.975 25.93 3.81 25.768C3.647 25.608 3.531 25.459 3.464 25.367C3.307 25.153 3.167 24.907 3.046 24.627C2.828 24.124 2.707 23.594 2.633 23.162C2.401 21.806 2.4 20.471 2.4 16C2.4 11.529 2.401 10.194 2.633 8.838C2.707 8.406 2.828 7.876 3.046 7.373C3.167 7.093 3.307 6.847 3.464 6.633C3.531 6.541 3.647 6.392 3.81 6.232C3.975 6.07 4.183 5.902 4.45 5.748C4.899 5.487 5.367 5.35 5.715 5.27C6.873 5.004 8.037 5 11.9 5C15.763 5 16.927 5.004 18.085 5.27C18.433 5.35 18.901 5.487 19.35 5.748C19.617 5.902 19.825 6.07 19.99 6.232C20.153 6.392 20.269 6.541 20.336 6.633C20.493 6.847 20.633 7.093 20.754 7.373C20.972 7.876 21.093 8.406 21.167 8.838C21.399 10.194 21.4 11.529 21.4 16ZM12.1 9.9A6.1 6.1 0 1 0 12.1 22.1L15.3 22.1A0.7 0.7 0 0 0 16 21.4L16 19.7A0.7 0.7 0 0 0 15.3 19L12.9 19A3.0 3.0 0 1 1 12.9 13L17.1 13A0.7 0.7 0 0 0 17.8 12.3L17.8 10.6A0.7 0.7 0 0 0 17.1 9.9Z";

/** Point corail (la « seconde ») : Ø 5,4 (≈ 1,4 × le dos du C, 0,25 × la hauteur de la carte), à 2,8 u à droite de la carte (≥ 1,4 px de jour à 16 px), tangent à sa ligne de base (y = 27). */
export const BRAND_MARK_POINT = { cx: 26.9, cy: 24.3, r: 2.7 };

/** Boîte englobante de l'encre du mark (corps + point), en unités /32. */
export const BRAND_MARK_BBOX = { x0: 2.4, y0: 5, x1: 29.6, y1: 27 };

/**
 * Variante favicon (≤ 32 px) : même carte, point grossi à Ø 6,4 (3,2 px à 16 px au lieu de 2,7) pour
 * que l'instant corail survive dans un onglet — le lockup, lui, garde la proportion typographique.
 * Utilisée UNIQUEMENT par scripts/brand-assets.ts (icon.svg / favicon.ico).
 */
export const BRAND_FAVICON_BODY_PATH = BRAND_MARK_BODY_PATH;
export const BRAND_FAVICON_POINT = { cx: 27.4, cy: 23.8, r: 3.2 };

/** Couleurs de marque en hex (miroir des tokens oklch de globals.css — pour les contextes sans CSS). */
export const BRAND_COLORS = {
  canard700: "#21474f",
  canard600: "#2c5a66",
  /** Favicon par défaut : ≈ 3,0:1 sur un onglet Chrome sombre ET ≈ 4,4:1 sur sand-50. */
  canard500: "#3d7280",
  /** = oklch(0.74 0.034 198), le token canard-300 exact. */
  canard300: "#96b3b5",
  canard200: "#b4c9c9",
  corail500: "#e8704e",
  /** Corail « encre » pour les fonds CLAIRS : oklch(0.60 0.185 39) ≈ 3,6:1 sur sand-50 (corail-500 tombe à 2,9:1, sous le 3:1 des objets graphiques). Sur nuit, corail-500 reste la référence. */
  corailInk: "#d5603c",
  sand50: "#fbfaf7",
  sand100: "#f6f4f0",
  nuit900: "#141e24",
  ink: "#181d22",
} as const;

export type MarkFills = { body: string; point: string };

/** SVG autonome du mark (chaîne) — pour data-URI / fichiers. */
export function brandMarkSvg({ body, point }: MarkFills): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BRAND_MARK_VIEWBOX}"><path fill="${body}" d="${BRAND_MARK_BODY_PATH}"/><circle fill="${point}" cx="${BRAND_MARK_POINT.cx}" cy="${BRAND_MARK_POINT.cy}" r="${BRAND_MARK_POINT.r}"/></svg>`;
}

/**
 * Icône d'application 512×512 (apple-icon, manifest) : fond plein canard-700, carte porcelaine,
 * point corail. Encre = 68 % du côté (348 × 281 px) ; boîte centrée, puis remontée de 4 px (le point
 * alourdit le bas-droit) et décalée de +2 px (masse de la carte à gauche) ; marges ≥ 12 %.
 */
export const BRAND_APP_ICON = { size: 512, translate: [53, 47] as const, scale: 12.79 };

export function brandAppIconSvg(): string {
  const { size, translate, scale } = BRAND_APP_ICON;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${BRAND_COLORS.canard700}"/><g transform="translate(${translate[0]} ${translate[1]}) scale(${scale})"><path fill="${BRAND_COLORS.sand50}" d="${BRAND_MARK_BODY_PATH}"/><circle fill="${BRAND_COLORS.corail500}" cx="${BRAND_MARK_POINT.cx}" cy="${BRAND_MARK_POINT.cy}" r="${BRAND_MARK_POINT.r}"/></g></svg>`;
}

/** Encode un SVG en data-URI utilisable par satori (`<img src>`) et par les navigateurs. */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
