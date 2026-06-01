import { ImageResponse } from "next/og";

// Next.js file-based metadata: this route is served at /apple-icon and
// referenced as <link rel="apple-touch-icon"> automatically. Without it, iOS
// Safari "Add to Home Screen" falls back on favicon.ico (poorly scaled).

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fbfaf7",
      }}
    >
      {/* Point canard centré — diamètre 112px dans 180×180 (safe-area iOS ~22px/bord) */}
      <div style={{ width: 112, height: 112, borderRadius: "50%", background: "#2c5a66" }} />
    </div>,
    { ...size },
  );
}
