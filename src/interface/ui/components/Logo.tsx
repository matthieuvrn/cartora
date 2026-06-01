import { cn } from "@/lib/utils";

type LogoVariant = "lockup" | "wordmark" | "dot";

type LogoProps = {
  /** "lockup" = point + wordmark (défaut), "wordmark" = texte seul, "dot" = point seul */
  variant?: LogoVariant;
  /** Hauteur via classe utilitaire (ex. "h-7"). Le SVG scale sur sa hauteur. */
  className?: string;
};

/**
 * Lockup de marque Cartora : point canard + wordmark Fraunces.
 * SVG inline qui scale sur sa hauteur (`className="h-7"`). Le point utilise la famille
 * canard (correcte même hors `.theme-cartora`, ex. footer neutre) ; le wordmark suit
 * `--foreground` et la police display via `var(--font-fraunces)`.
 */
export function Logo({ variant = "lockup", className }: LogoProps) {
  const label = "Cartora";

  if (variant === "dot") {
    return (
      <svg
        viewBox="0 0 32 32"
        role="img"
        aria-label={label}
        className={cn("h-7 w-auto", className)}
      >
        <circle cx="16" cy="16" r="10" className="fill-canard-600 dark:fill-canard-300" />
      </svg>
    );
  }

  const withDot = variant === "lockup";

  return (
    <svg
      viewBox={withDot ? "0 0 240 56" : "0 0 196 56"}
      role="img"
      aria-label={label}
      className={cn("h-7 w-auto", className)}
    >
      {withDot && (
        <circle cx="20" cy="28" r="12" className="fill-canard-600 dark:fill-canard-300" />
      )}
      <text
        x={withDot ? 44 : 0}
        y="40"
        className="fill-foreground"
        style={{
          fontFamily: "var(--font-fraunces)",
          fontWeight: 500,
          fontSize: 36,
          letterSpacing: "-0.02em",
        }}
      >
        {label}
      </text>
    </svg>
  );
}
