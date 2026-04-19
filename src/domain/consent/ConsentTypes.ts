export type ConsentStatus = "accepted" | "refused" | "pending";

export const CONSENT_COOKIE_NAME = "cartora-consent";
export const CONSENT_MAX_AGE_SECONDS = 34164000; // ~13 months (CNIL max)
