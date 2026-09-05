import OpenGraphImage, { contentType, size } from "../opengraph-image";

// Ré-export du visuel OG racine pour le segment `/en` : le `openGraph` de landingMetadata
// remplace celui du root en bloc, et Next ne réinjecte l'image file-based que depuis le
// segment qui la déclare — sans ce fichier, /en n'avait ni og:image ni twitter:image
// (recette 2026-09-04). Composition FR assumée (visuel de marque unique) ; seul l'alt est EN.
export const alt = "Cartora — Digital menu for independent restaurants";
export { contentType, size };

export default OpenGraphImage;
