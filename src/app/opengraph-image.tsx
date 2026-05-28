import { ImageResponse } from "next/og";

// Next.js file-based metadata: served at /opengraph-image and auto-injected
// as og:image (1200×630, summary_large_image-compatible). Static composition
// in FR — the dominant locale. EN visitors share the FR card; honest 2026
// trade-off given hreflang is intentionally skipped J1 (see step 15 plan).

export const alt = "Cartora — Menu digital pour restaurateurs indépendants";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        padding: "80px",
        color: "white",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          width: 96,
          height: 96,
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: "-0.05em",
        }}
      >
        C
      </div>

      {/* Brand name + tagline */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          Cartora
        </div>
        <div
          style={{
            fontSize: 40,
            color: "#a1a1aa",
            lineHeight: 1.2,
            maxWidth: 900,
          }}
        >
          Menu digital pour restaurateurs indépendants
        </div>
      </div>

      {/* Footer URL */}
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 80,
          fontSize: 22,
          color: "#71717a",
        }}
      >
        cartora.app
      </div>
    </div>,
    { ...size },
  );
}
