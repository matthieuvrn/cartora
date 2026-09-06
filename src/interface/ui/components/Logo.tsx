import { cn } from "@/lib/utils";
import {
  BRAND_MARK_BODY_PATH,
  BRAND_MARK_POINT,
  BRAND_MARK_VIEWBOX,
} from "@/interface/ui/brand/mark";
import {
  BRAND_WORDMARK,
  brandLockupLayout,
  brandWordmarkLayout,
} from "@/interface/ui/brand/wordmark";

type LogoVariant = "lockup" | "wordmark" | "mark";
type LogoTone = "brand" | "mono";

type LogoProps = {
  /** "lockup" = mark + wordmark (défaut), "wordmark" = texte seul, "mark" = signe seul */
  variant?: LogoVariant;
  /**
   * "brand" (défaut) : corps en `--logo-mark`, point en `--logo-accent` (tokens backés sous
   * `.theme-cartora`/`.theme-app`, `.dark` et `.section-nuit` — cf. globals.css), wordmark en
   * `--foreground`. "mono" : tout en `currentColor` — pour les surfaces neutres (footer des menus
   * publics, filigrane) où la marque ne doit pas injecter sa couleur.
   */
  tone?: LogoTone;
  /** Hauteur via classe utilitaire (ex. "h-7"). Le SVG scale sur sa hauteur. */
  className?: string;
};

const BODY_BRAND = { fill: "var(--logo-mark, #2c5a66)" } as const;
const POINT_BRAND = { fill: "var(--logo-accent, #e8704e)" } as const;
const CURRENT = { fill: "currentColor" } as const;

/**
 * Logo Cartora — mark « Point final » (carte canard + point corail) et wordmark Fraunces
 * OUTLINÉ (géométrie dans `@/interface/ui/brand/mark`). Vectoriel pur : aucun `<text>`, donc
 * aucune dépendance au chargement de la webfont (l'ancien lockup rendait « Cartora » en
 * fallback serif avant l'arrivée de Fraunces). SVG inline qui scale sur sa hauteur.
 */
export function Logo({ variant = "lockup", tone = "brand", className }: LogoProps) {
  const label = "Cartora";
  const body = tone === "mono" ? CURRENT : BODY_BRAND;
  const point = tone === "mono" ? CURRENT : POINT_BRAND;
  const textClass = tone === "mono" ? undefined : "fill-foreground";

  if (variant === "mark") {
    return (
      <svg
        viewBox={BRAND_MARK_VIEWBOX}
        role="img"
        aria-label={label}
        className={cn("h-7 w-auto", className)}
      >
        <path style={body} d={BRAND_MARK_BODY_PATH} />
        <circle
          style={point}
          cx={BRAND_MARK_POINT.cx}
          cy={BRAND_MARK_POINT.cy}
          r={BRAND_MARK_POINT.r}
        />
      </svg>
    );
  }

  if (variant === "wordmark") {
    const l = brandWordmarkLayout();
    return (
      <svg
        viewBox={l.viewBox}
        role="img"
        aria-label={label}
        className={cn("h-7 w-auto", className)}
      >
        <path
          style={tone === "mono" ? CURRENT : undefined}
          className={textClass}
          transform={l.text.transform}
          d={BRAND_WORDMARK.path}
        />
      </svg>
    );
  }

  const l = brandLockupLayout();
  return (
    <svg viewBox={l.viewBox} role="img" aria-label={label} className={cn("h-7 w-auto", className)}>
      <g transform={l.mark.transform}>
        <path style={body} d={BRAND_MARK_BODY_PATH} />
        <circle
          style={point}
          cx={BRAND_MARK_POINT.cx}
          cy={BRAND_MARK_POINT.cy}
          r={BRAND_MARK_POINT.r}
        />
      </g>
      <path
        style={tone === "mono" ? CURRENT : undefined}
        className={textClass}
        transform={l.text.transform}
        d={BRAND_WORDMARK.path}
      />
    </svg>
  );
}
