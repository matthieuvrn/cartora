import type { CartoraIconProps } from "./types";

/** Caractère 文 + lettre A — bilingue visuel, pas un drapeau (anti-folklore). */
export function LanguagesIcon({ className }: CartoraIconProps) {
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
      <path d="M3 7 L11 7" />
      <path d="M7 7 L7 5" />
      <path d="M5 7 Q7 14 9 7" />
      <path d="M3 11 Q7 19 11 11" />
      <path d="M14 18 L17 9 L20 18" />
      <path d="M15 15 L19 15" />
    </svg>
  );
}
