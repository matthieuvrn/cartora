import { ImageResponse } from "next/og";
import { brandAppIconSvg, svgDataUri } from "@/interface/ui/brand/mark";

// Next.js file-based metadata: this route is served at /apple-icon and
// referenced as <link rel="apple-touch-icon"> automatically. Without it, iOS
// Safari "Add to Home Screen" falls back on favicon.ico (poorly scaled).
//
// Composition = l'icône d'application de la marque (fond canard-700, carte porcelaine, point
// corail), rendue depuis le SVG partagé (`brandAppIconSvg`) via <img data-URI> : satori dessine
// les SVG embarqués tels quels, pas besoin de re-décrire la géométrie ici. iOS applique lui-même
// ses coins arrondis ; le mark reste dans la safe-area (12 %).

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <img src={svgDataUri(brandAppIconSvg())} width={180} height={180} alt="" />
    </div>,
    { ...size },
  );
}
