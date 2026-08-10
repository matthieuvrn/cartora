import QRCode from "qrcode";

/**
 * Génération du QR de la landing en SVG **au build** (RSC statique) : zéro octet de JS
 * client, contrairement à `qr-code-styling` (réservé à l'éditeur /app/partage, SSR-unsafe).
 * Modules carrés noirs classiques + EC `M` : la scannabilité prime sur le style ici.
 * NE PAS importer depuis un fichier "use client" — la lib entrerait dans le bundle landing
 * (budget 300 KB gz surveillé par scripts/check-landing-budget.mjs).
 */

const QUIET_ZONE_MODULES = 2; // complété par le padding blanc de la carte (≈ 4 modules au total)

export type QrSvgData = {
  /** Attribut `d` d'un unique <path> — un carré 1×1 par module sombre. */
  path: string;
  /** Côté du viewBox (modules + zone de silence). */
  viewBoxSize: number;
};

export function buildQrSvgData(text: string): QrSvgData {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const data = qr.modules.data;

  let path = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[y * size + x]) {
        path += `M${x + QUIET_ZONE_MODULES} ${y + QUIET_ZONE_MODULES}h1v1h-1z`;
      }
    }
  }

  return { path, viewBoxSize: size + QUIET_ZONE_MODULES * 2 };
}
