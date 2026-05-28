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
        background: "#1a1a1a",
        color: "white",
        fontSize: 112,
        fontWeight: 700,
        letterSpacing: "-0.05em",
        borderRadius: 40,
      }}
    >
      C
    </div>,
    { ...size },
  );
}
