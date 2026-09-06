import type { MetadataRoute } from "next";

/**
 * Web app manifest (Next file-based metadata → <link rel="manifest">). Sert l'icône « Ajouter
 * à l'écran d'accueil » Android/Chrome (iOS lit `apple-icon.tsx`). Les PNG sont statiques dans
 * `public/brand/` (générés une fois depuis le mark SVG — voir src/interface/ui/brand/mark.ts) :
 * pas de route dynamique, rien à recalculer au build. `start_url` = le dashboard : c'est le
 * restaurateur qui installe Cartora, pas le convive qui scanne un QR.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cartora — Menu digital pour restaurants",
    short_name: "Cartora",
    description:
      "Créez et publiez la carte de votre restaurant en ligne, avec QR code et mise à jour à la seconde.",
    lang: "fr",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#fbfaf7",
    theme_color: "#fbfaf7",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/brand/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
