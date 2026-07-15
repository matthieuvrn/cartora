import { LOGO_OUTPUT_SIZE } from "@/domain/restaurant/BrandingPolicy";

/**
 * Zone de recadrage en pixels sources, telle que fournie par react-easy-crop
 * (`onCropComplete(_, croppedAreaPixels)`). Redéclarée ici pour ne pas coupler
 * cet util pur au type `Area` de la lib.
 */
export type CropAreaPixels = { x: number; y: number; width: number; height: number };

/**
 * Recadre `file` sur la zone carrée `area`, downscale à `LOGO_OUTPUT_SIZE²` et
 * ré-encode en WebP. Préserve la transparence (canvas non peint = alpha 0) et
 * strippe l'EXIF au passage. Sortie déterministe quelle que soit l'entrée.
 *
 * Util **client-only** (DOM/canvas) — hors scope des tests unitaires (cf. CLAUDE.md).
 */
export async function cropImageToWebp(file: File, area: CropAreaPixels): Promise<Blob> {
  const image = await loadImage(file);

  const canvas = document.createElement("canvas");
  canvas.width = LOGO_OUTPUT_SIZE;
  canvas.height = LOGO_OUTPUT_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    LOGO_OUTPUT_SIZE,
    LOGO_OUTPUT_SIZE,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.92),
  );
  if (!blob) throw new Error("WebP encoding failed");
  return blob;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed"));
    };
    img.src = url;
  });
}
