export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_ALT_TEXT_LENGTH = 200;

const MIME_SET: ReadonlySet<string> = new Set(ALLOWED_IMAGE_MIME_TYPES);

const MIME_TO_EXT: Record<AllowedImageMime, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class ItemPhotoPolicy {
  static isAllowedMime(mime: string): mime is AllowedImageMime {
    return MIME_SET.has(mime);
  }

  static validateMimeType(mime: string): string | null {
    if (!ItemPhotoPolicy.isAllowedMime(mime)) {
      return "Format non supporté (JPEG, PNG, WebP uniquement)";
    }
    return null;
  }

  static validateSize(bytes: number): string | null {
    if (!Number.isFinite(bytes) || bytes <= 0) return "Fichier vide ou invalide";
    if (bytes > MAX_IMAGE_SIZE_BYTES) {
      return `Image trop lourde (max ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)} Mo)`;
    }
    return null;
  }

  static validateAltText(text: string): { ok: string; error: string | null } {
    const trimmed = text.trim();
    if (trimmed.length > MAX_ALT_TEXT_LENGTH) {
      return {
        ok: trimmed.slice(0, MAX_ALT_TEXT_LENGTH),
        error: `La description ne doit pas dépasser ${MAX_ALT_TEXT_LENGTH} caractères`,
      };
    }
    return { ok: trimmed, error: null };
  }

  static extensionForMime(mime: AllowedImageMime): "jpg" | "png" | "webp" {
    return MIME_TO_EXT[mime];
  }

  static buildStoragePath(
    restaurantId: string,
    itemId: string,
    ext: "jpg" | "png" | "webp",
  ): string {
    return `${restaurantId}/${itemId}.${ext}`;
  }
}
