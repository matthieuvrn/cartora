import { ImageResponse } from "next/og";

// Next.js file-based metadata: served at /opengraph-image and auto-injected as og:image
// (1200×630, summary_large_image). Composition statique en FR (locale dominante).
//
// Police : satori (le moteur d'ImageResponse) ne lit que TTF/OTF/WOFF — pas le WOFF2
// variable de @fontsource-variable/fraunces. On assume donc une stack serif (Georgia) pour
// le display plutôt que d'embarquer un binaire statique ou un fetch réseau au build (build
// hermétique). NB : le doc UI 2026 fetchait le CSS Google Fonts sans jamais le passer à
// `fonts:` — Fraunces n'y était jamais rendue (fallback serif silencieux). On fait pareil,
// mais explicitement.

export const alt = "Cartora — Menu digital pour restaurateurs indépendants";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CANARD = "#2c5a66";
const SAPIN = "#1f4a3a";
const CREAM = "#fbfaf7";
const INK = "#181d22";
const SAND_MUTED = "#6f6a5e";
const SERIF = "Georgia, 'Times New Roman', serif";

export default function OpenGraphImage() {
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
        fontFamily: SERIF,
        position: "relative",
      }}
    >
      {/* Lockup logo — point canard + wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: CANARD }} />
        <span style={{ fontSize: 44, fontWeight: 500, letterSpacing: "-0.02em", color: INK }}>
          Cartora
        </span>
      </div>

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
          Votre carte en ligne. Mise à jour à la&nbsp;
          <span style={{ color: SAPIN, fontStyle: "italic" }}>seconde</span>.
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
          Sans carte bancaire · Configuration en 10 minutes · 100% RGPD français
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
    { ...size },
  );
}
