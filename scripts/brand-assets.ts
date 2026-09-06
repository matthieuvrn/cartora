/**
 * Régénère les fichiers DÉRIVÉS de l'identité (source de vérité : `src/interface/ui/brand/mark.ts`) :
 *   - src/app/icon.svg              favicon SVG (variante ≤ 32 px ; corps canard-500 par défaut — tient sur onglet clair ET sombre —, canard-300 via prefers-color-scheme: dark)
 *   - src/app/favicon.ico           PNG-in-ICO 16/32/48 (Safari et navigateurs sans favicon SVG)
 *   - public/brand/icon-192.png     manifest (Android/Chrome « Ajouter à l'écran d'accueil »)
 *   - public/brand/icon-512.png
 *   - public/brand/icon-512-maskable.png  (mark réduit dans la zone sûre 80 % du masque)
 * `apple-icon.tsx` et `opengraph-image.tsx` lisent le module directement (rien à régénérer).
 *
 * Usage : pnpm brand:assets — à relancer après TOUTE modification de la géométrie ou des couleurs.
 * Rasterisation via `sharp`, dépendance transitive de Next (non déclarée : résolue depuis le
 * dossier de `next`, jamais importée par le code applicatif).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import {
  BRAND_COLORS,
  BRAND_FAVICON_BODY_PATH,
  BRAND_FAVICON_POINT,
  BRAND_MARK_VIEWBOX,
  brandAppIconSvg,
} from "@/interface/ui/brand/mark";

// Typage structurel minimal : `sharp` n'est pas une dépendance déclarée (pas de types installés).
type SharpImage = {
  resize(w: number, h: number, o: { fit: "contain"; background: unknown }): SharpImage;
  png(o: { compressionLevel: number }): SharpImage;
  composite(items: { input: Buffer; left: number; top: number }[]): SharpImage;
  toBuffer(): Promise<Buffer>;
  toFile(path: string): Promise<unknown>;
};
type SharpFactory = (
  input: Buffer | { create: { width: number; height: number; channels: 4; background: string } },
  options?: { density: number },
) => SharpImage;

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp") as SharpFactory;

const root = process.cwd();
const appDir = join(root, "src/app");
const brandDir = join(root, "public/brand");
mkdirSync(brandDir, { recursive: true });

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BRAND_MARK_VIEWBOX}"><style>.b{fill:${BRAND_COLORS.canard500}}@media (prefers-color-scheme:dark){.b{fill:${BRAND_COLORS.canard300}}}</style><path class="b" d="${BRAND_FAVICON_BODY_PATH}"/><circle fill="${BRAND_COLORS.corailInk}" cx="${BRAND_FAVICON_POINT.cx}" cy="${BRAND_FAVICON_POINT.cy}" r="${BRAND_FAVICON_POINT.r}"/></svg>\n`;
writeFileSync(join(appDir, "icon.svg"), faviconSvg);

// Le .ico est rasterisé depuis la variante favicon CLAIRE (les .ico n'ont pas de mode sombre).
const faviconLight = Buffer.from(
  faviconSvg
    .replace(/<style>.*?<\/style>/, "")
    .replace('class="b"', `fill="${BRAND_COLORS.canard500}"`),
);
const raster = (svg: Buffer, size: number) =>
  sharp(svg, { density: 72 * 16 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

async function main() {
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(sizes.map((s) => raster(faviconLight, s)));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = 6 + 16 * sizes.length;
  const dirs = sizes.map((s, i) => {
    const d = Buffer.alloc(16);
    d.writeUInt8(s, 0);
    d.writeUInt8(s, 1);
    d.writeUInt16LE(1, 4);
    d.writeUInt16LE(32, 6);
    d.writeUInt32LE(pngs[i].length, 8);
    d.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    return d;
  });
  writeFileSync(join(appDir, "favicon.ico"), Buffer.concat([header, ...dirs, ...pngs]));

  const appIcon = Buffer.from(brandAppIconSvg());
  for (const s of [192, 512])
    writeFileSync(join(brandDir, `icon-${s}.png`), await raster(appIcon, s));

  // Maskable : le masque Android peut rogner jusqu'à 10 % par bord → icône complète réduite à 66 %
  // sur son propre fond (canard-700), l'encre reste dans la zone sûre.
  const inner = await raster(appIcon, Math.round(512 * 0.66));
  const pad = Math.round((512 - 512 * 0.66) / 2);
  const bg = BRAND_COLORS.canard700;
  await sharp({ create: { width: 512, height: 512, channels: 4, background: bg } })
    .composite([{ input: inner, left: pad, top: pad }])
    .png({ compressionLevel: 9 })
    .toFile(join(brandDir, "icon-512-maskable.png"));

  console.log("✓ icon.svg, favicon.ico, public/brand/icon-{192,512,512-maskable}.png régénérés");
}

void main();
