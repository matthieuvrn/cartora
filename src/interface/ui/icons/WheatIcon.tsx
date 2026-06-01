import type { CartoraIconProps } from "./types";

/** Épi de blé stylisé, 3 paires d'épillets — symbole gluten / allergène universel. */
export function WheatIcon({ className }: CartoraIconProps) {
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
      <path d="M12 22 L12 4" />
      <path d="M12 8 Q8 6 7 9 Q10 10 12 10" />
      <path d="M12 8 Q16 6 17 9 Q14 10 12 10" />
      <path d="M12 12 Q8 10 7 13 Q10 14 12 14" />
      <path d="M12 12 Q16 10 17 13 Q14 14 12 14" />
      <path d="M12 16 Q8 14 7 17 Q10 18 12 18" />
      <path d="M12 16 Q16 14 17 17 Q14 18 12 18" />
    </svg>
  );
}
