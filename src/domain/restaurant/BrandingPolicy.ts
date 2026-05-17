import type { ValidationFailure } from "@/domain/errors/DomainError";

export const ALLOWED_LOGO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedLogoMime = (typeof ALLOWED_LOGO_MIME_TYPES)[number];

export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

const MIME_SET: ReadonlySet<string> = new Set(ALLOWED_LOGO_MIME_TYPES);

const MIME_TO_EXT: Record<AllowedLogoMime, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class BrandingPolicy {
  static isAllowedMime(mime: string): mime is AllowedLogoMime {
    return MIME_SET.has(mime);
  }

  static validateMimeType(mime: string): ValidationFailure | null {
    if (!BrandingPolicy.isAllowedMime(mime)) {
      return { field: "mime", code: "unsupported_mime" };
    }
    return null;
  }

  static validateSize(bytes: number): ValidationFailure | null {
    if (!Number.isFinite(bytes) || bytes <= 0) return { field: "size", code: "validation_failed" };
    if (bytes > MAX_LOGO_SIZE_BYTES) {
      return { field: "size", code: "validation_failed" };
    }
    return null;
  }

  static extensionForMime(mime: AllowedLogoMime): "jpg" | "png" | "webp" {
    return MIME_TO_EXT[mime];
  }

  static buildLogoStoragePath(restaurantId: string, ext: "jpg" | "png" | "webp"): string {
    return `${restaurantId}/logo.${ext}`;
  }
}
