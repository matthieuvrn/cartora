import type { CartoraIconProps } from "./types";

/** Calendrier avec point central plein — « aujourd'hui » comme tampon (menu du jour). */
export function CalendarIcon({ className }: CartoraIconProps) {
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
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10 L21 10" />
      <path d="M8 3 L8 7" />
      <path d="M16 3 L16 7" />
      <circle cx="12" cy="15" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
