import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND_COLORS, svgDataUri } from "@/interface/ui/brand/mark";
import { brandLockupSvg } from "@/interface/ui/brand/wordmark";

// Next.js file-based metadata: served at /opengraph-image and auto-injected as og:image
// (1200×630, summary_large_image). Composition statique en FR (locale dominante).
//
// Police : satori (le moteur d'ImageResponse) ne lit que TTF/OTF/WOFF — pas le WOFF2 variable de
// @fontsource-variable/fraunces. On embarque donc deux instances STATIQUES sous-ensemblées
// (Fraunces wght 500 / opsz 144, romain + italique, latin + accents FR, ~22 + 27 Ko) dans
// `src/app/_og/`, lues au build via fs (build hermétique, zéro fetch réseau). Le lockup, lui,
// est vectoriel (wordmark outliné) : il ne dépend d'aucune police.

export const alt = "Cartora — Menu digital pour restaurateurs indépendants";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CANARD = BRAND_COLORS.canard600;
// Corail « encre » (≥ 3:1 sur crème) : même climax que le hero de la landing — le sapin est réservé au succès.
const CORAIL = BRAND_COLORS.corailInk;
const CREAM = BRAND_COLORS.sand50;
const INK = BRAND_COLORS.ink;
const SAND_MUTED = "#6f6a5e";
const FRAUNCES = "Fraunces";

async function loadFonts() {
  const dir = join(process.cwd(), "src/app/_og");
  const [regular, italic] = await Promise.all([
    readFile(join(dir, "fraunces-500.ttf")),
    readFile(join(dir, "fraunces-500-italic.ttf")),
  ]);
  return [
    { name: FRAUNCES, data: regular, weight: 500 as const, style: "normal" as const },
    { name: FRAUNCES, data: italic, weight: 500 as const, style: "italic" as const },
  ];
}

export default async function OpenGraphImage() {
  const fonts = await loadFonts();
  const lockup = svgDataUri(brandLockupSvg({ body: CANARD, point: CORAIL, text: INK }));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `radial-gradient(ellipse at top left, ${CANARD}22 0%, ${CREAM} 50%)`,
        display: "flex",
        flexDirection: "column",
        padding: "88px 96px",
        color: INK,
        fontFamily: FRAUNCES,
        position: "relative",
      }}
    >
      {/* Lockup logo — mark + wordmark outliné (hauteur 56 px ≈ cap-height 52) */}
      <img src={lockup} height={56} alt="" />

      {/* Punchline */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 920,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontSize: 92,
            fontWeight: 500,
            lineHeight: 1.05,
            letterSpacing: "-0.035em",
            color: INK,
          }}
        >
          Votre carte en ligne en&nbsp;
          <span style={{ color: CORAIL, fontStyle: "italic" }}>10&nbsp;minutes</span>.
        </div>
        <div
          style={{
            fontSize: 30,
            lineHeight: 1.3,
            color: SAND_MUTED,
            fontFamily: "system-ui, sans-serif",
            fontWeight: 400,
          }}
        >
          Sans carte bancaire · Mise à jour à la seconde · 100% RGPD français
        </div>
      </div>

      {/* URL discret en haut droite */}
      <div
        style={{
          position: "absolute",
          top: 96,
          right: 96,
          fontSize: 22,
          color: SAND_MUTED,
          fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
        }}
      >
        cartora.app
      </div>
    </div>,
    { ...size, fonts },
  );
}
