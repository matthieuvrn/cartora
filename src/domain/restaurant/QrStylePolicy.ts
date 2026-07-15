import { DomainError } from "@/domain/errors/DomainError";
import { BrandingPolicy } from "@/domain/restaurant/BrandingPolicy";

/**
 * Personnalisation visuelle du QR code (page Partage), 100 % découplée du template
 * et des couleurs de marque (décision produit 2026). Le QR est rendu **côté navigateur**
 * via `qr-code-styling` — impossible côté serveur sur Vercel (jsdom + canvas natif) — donc
 * cette Policy ne fait QUE valider/normaliser le style persisté ; le rendu vit dans l'UI.
 *
 * Le contenu encodé (l'URL publique du menu) n'est PAS ici : le style est pure décoration.
 * Un QrStyle n'entre jamais dans le snapshot public → sa mutation ne re-draft PAS le menu.
 *
 * Garde-fous scannabilité (non négociables — un QR qui ne scanne pas est pire que rien) :
 *   - contraste modules/fond ≥ `QR_MIN_CONTRAST`
 *   - pas de code inversé (modules plus clairs que le fond)
 *   - styles de points/coins bornés à un sous-ensemble curé
 *   - quiet-zone + niveau de correction d'erreur imposés par constantes (non exposés en v1)
 */

/** Style des modules de données. Sous-ensemble curé des types `qr-code-styling`. */
export const QR_DOT_STYLES = ["square", "rounded", "dots", "classy", "extra-rounded"] as const;
export type QrDotStyle = (typeof QR_DOT_STYLES)[number];

/** Style des 3 repères d'angle (finder patterns). */
export const QR_CORNER_STYLES = ["square", "rounded", "dots"] as const;
export type QrCornerStyle = (typeof QR_CORNER_STYLES)[number];

export type QrStyle = {
  /** Couleur des modules (hex `#rrggbb`, normalisé lowercase). */
  darkColor: string;
  /** Couleur du fond (hex `#rrggbb`, normalisé lowercase). */
  lightColor: string;
  dotsStyle: QrDotStyle;
  cornersStyle: QrCornerStyle;
};

/**
 * Style par défaut = noir sur blanc, modules carrés, coins carrés.
 * « Aucune personnalisation » (colonne `qr_style` NULL) rend exactement ce look —
 * identique au QR historique, donc zéro régression visuelle.
 */
export const DEFAULT_QR_STYLE: QrStyle = {
  darkColor: "#000000",
  lightColor: "#ffffff",
  dotsStyle: "square",
  cornersStyle: "square",
};

/**
 * Plancher de contraste modules/fond. Aligné sur WCAG AA (4.5:1) — volontairement
 * strict : contrairement au texte, un QR sous ce seuil devient réellement illisible
 * pour beaucoup de scanners, et il n'y a PAS d'échappatoire « forcer » (cf. UI).
 */
export const QR_MIN_CONTRAST = 4.5;

/** Constantes de rendu (consommées par l'UI / le téléchargement, pas persistées). */
export const QR_RENDER_SIZE = 512;
export const QR_QUIET_ZONE_PX = 32;
/** Niveau de correction d'erreur imposé : « Q » (25 %) tolère mieux les styles à points. */
export const QR_ERROR_CORRECTION = "Q" as const;

type QrStyleInput = {
  darkColor: string;
  lightColor: string;
  dotsStyle: string;
  cornersStyle: string;
};

export class QrStylePolicy {
  /**
   * Valide + normalise un style saisi. Point d'entrée unique avant persistance.
   * Throw :
   *   - `invalid_brand_color` (via BrandingPolicy) si un hex est malformé,
   *   - `invalid_qr_style` si un style de points/coins est hors énumération ou si le code est inversé,
   *   - `qr_low_contrast` si le contraste modules/fond est sous le plancher.
   */
  static normalize(input: QrStyleInput): QrStyle {
    const darkColor = BrandingPolicy.normalizeHexColor(input.darkColor, "darkColor");
    const lightColor = BrandingPolicy.normalizeHexColor(input.lightColor, "lightColor");

    if (!QrStylePolicy.isDotStyle(input.dotsStyle)) {
      throw new DomainError("invalid_qr_style", {
        field: "dotsStyle",
        invalidValue: input.dotsStyle,
      });
    }
    if (!QrStylePolicy.isCornerStyle(input.cornersStyle)) {
      throw new DomainError("invalid_qr_style", {
        field: "cornersStyle",
        invalidValue: input.cornersStyle,
      });
    }

    // Code inversé : les modules doivent être plus sombres que le fond. Un contraste
    // élevé « à l'envers » (blanc sur noir) passe le ratio mais casse certains scanners.
    if (
      BrandingPolicy.relativeLuminance(darkColor) >= BrandingPolicy.relativeLuminance(lightColor)
    ) {
      throw new DomainError("invalid_qr_style", { field: "inverted" });
    }

    if (BrandingPolicy.contrastRatio(darkColor, lightColor) < QR_MIN_CONTRAST) {
      throw new DomainError("qr_low_contrast", { field: "contrast" });
    }

    return { darkColor, lightColor, dotsStyle: input.dotsStyle, cornersStyle: input.cornersStyle };
  }

  static isDotStyle(value: string): value is QrDotStyle {
    return (QR_DOT_STYLES as readonly string[]).includes(value);
  }

  static isCornerStyle(value: string): value is QrCornerStyle {
    return (QR_CORNER_STYLES as readonly string[]).includes(value);
  }

  /**
   * Prédicat pur (ne throw jamais) pour le chemin de render UI : true si le style
   * complet est scannable (hex valides, non inversé, contraste ok). Permet de
   * désactiver Save/Download sans devoir attraper une exception à chaque frappe.
   */
  static isScannable(darkColor: string, lightColor: string): boolean {
    if (!BrandingPolicy.isValidHexColor(darkColor) || !BrandingPolicy.isValidHexColor(lightColor)) {
      return false;
    }
    if (
      BrandingPolicy.relativeLuminance(darkColor) >= BrandingPolicy.relativeLuminance(lightColor)
    ) {
      return false;
    }
    return BrandingPolicy.contrastRatio(darkColor, lightColor) >= QR_MIN_CONTRAST;
  }
}
