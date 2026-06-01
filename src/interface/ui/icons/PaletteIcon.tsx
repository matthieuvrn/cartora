import type { CartoraIconProps } from "./types";

/** Palette de peintre avec 4 godets — branding visuel (couleurs de marque). */
export function PaletteIcon({ className }: CartoraIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3 C7 3 3 7 3 12 C3 17 7 21 12 21 Q14 21 14 19 Q14 17 16 17 L18 17 Q21 17 21 14 Q21 3 12 3 Z" />
      <circle cx="7" cy="11" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="13" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="9" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
