import { DomainError, type ValidationFailure } from "@/domain/errors/DomainError";

export const ALLOWED_LOGO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedLogoMime = (typeof ALLOWED_LOGO_MIME_TYPES)[number];

export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

const MIME_SET: ReadonlySet<string> = new Set(ALLOWED_LOGO_MIME_TYPES);

const MIME_TO_EXT: Record<AllowedLogoMime, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Seuil WCAG AA pour le contraste du texte de taille normale (body text).
 * Ratio minimum 4.5:1 entre la couleur de premier plan et la couleur de fond.
 * Le bouton "Forcer" côté UI permet de bypass ce seuil pour les cas conscients
 * (logo bicolore impossible à respecter, identité visuelle imposée…) mais
 * affiche un warning persistant pour ne pas masquer le risque d'accessibilité.
 */
export const WCAG_AA_CONTRAST = 4.5;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

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

  /**
   * Prédicat pur (ne throw jamais) : true si `input` est un hex `#RRGGBB` valide
   * (insensible à la casse, trim implicite). À utiliser pour garder les appels à
   * `meetsContrastAA` / `normalizeHexColor` dans le chemin de render, où la saisie
   * en cours peut être partielle (`#`, `#5a`, …) sans devoir attraper une exception.
   */
  static isValidHexColor(input: string): boolean {
    return HEX_RE.test(input.trim());
  }

  /**
   * Valide qu'une chaîne est au format hex `#RRGGBB` (insensible à la casse) et
   * retourne la forme normalisée en lowercase. Throw `DomainError('invalid_brand_color')`
   * sinon — sert de point d'entrée unique pour toutes les couleurs persistées.
   */
  static normalizeHexColor(input: string, field: string): string {
    const trimmed = input.trim();
    if (!HEX_RE.test(trimmed)) {
      throw new DomainError("invalid_brand_color", { field });
    }
    return trimmed.toLowerCase();
  }

  /**
   * Calcul du ratio de contraste WCAG 2.1 entre deux couleurs hex.
   * Retourne une valeur entre 1 (aucun contraste) et 21 (noir/blanc).
   * Formule : (L1 + 0.05) / (L2 + 0.05) avec L1 = luminance la plus claire.
   */
  static contrastRatio(hexA: string, hexB: string): number {
    const lumA = relativeLuminance(hexA);
    const lumB = relativeLuminance(hexB);
    const lighter = Math.max(lumA, lumB);
    const darker = Math.min(lumA, lumB);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * True si le contraste entre `fg` et `bg` atteint le seuil WCAG AA (4.5:1)
   * pour le texte de taille normale. À utiliser pour gater la sauvegarde côté
   * use case ou pour l'affichage d'un warning UI.
   */
  static meetsContrastAA(fg: string, bg: string): boolean {
    return BrandingPolicy.contrastRatio(fg, bg) >= WCAG_AA_CONTRAST;
  }
}

function relativeLuminance(hex: string): number {
  const m = HEX_RE.exec(hex);
  if (!m) throw new DomainError("invalid_brand_color", { field: "contrast_input" });
  const r = srgbToLinear(parseInt(hex.slice(1, 3), 16) / 255);
  const g = srgbToLinear(parseInt(hex.slice(3, 5), 16) / 255);
  const b = srgbToLinear(parseInt(hex.slice(5, 7), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function srgbToLinear(c: number): number {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
