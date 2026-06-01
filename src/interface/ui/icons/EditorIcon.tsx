import type { CartoraIconProps } from "./types";

/** Plume éditoriale (≠ crayon-école lucide). Le point en bas évoque l'encre. */
export function EditorIcon({ className }: CartoraIconProps) {
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
      <path d="M4 20 L4 16 L16 4 L20 8 L8 20 L4 20" />
      <path d="M14 6 L18 10" />
      <circle cx="5" cy="19" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
