import type { CartoraIconProps } from "./types";

/** Trois marqueurs + un quart custom — lit « QR » sans le pavage pixel chargé de lucide. */
export function QrCodeIcon({ className }: CartoraIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="15" y="3" width="6" height="6" rx="1.5" />
      <rect x="3" y="15" width="6" height="6" rx="1.5" />
      <rect x="5" y="5" width="2" height="2" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="17" y="5" width="2" height="2" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="5" y="17" width="2" height="2" rx="0.5" fill="currentColor" stroke="none" />
      <path d="M14 14 L21 14 L21 21 L17 21 L17 17 L14 17 Z" strokeLinecap="round" />
    </svg>
  );
}
