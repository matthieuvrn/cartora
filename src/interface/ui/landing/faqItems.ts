// Plain (non-"use client") module so both the RSC page.tsx (for JSON-LD
// FAQPage emission) and the client LandingFaqV2 component can import the
// FAQ key list. Keeping these in a "use client" file made them opaque to
// server consumers.

export type FaqItemKey =
  | "noCc"
  | "commitment"
  | "qrAgeingClients"
  | "allergens"
  | "bilingual"
  | "dataHosting"
  | "cancel"
  | "supportFr"
  | "multiRestaurants"
  | "qrPrinting";

export const FAQ_ITEMS: readonly FaqItemKey[] = [
  "noCc",
  "commitment",
  "qrAgeingClients",
  "allergens",
  "bilingual",
  "dataHosting",
  "cancel",
  "supportFr",
  "multiRestaurants",
  "qrPrinting",
] as const;
