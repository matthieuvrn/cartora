export type ConsentStatus = "accepted" | "refused" | "pending";

export const CONSENT_COOKIE_NAME = "cartora-consent";
export const CONSENT_MAX_AGE_SECONDS = 34164000; // ~13 months (CNIL max)
/**
 * Event DOM (window.dispatchEvent) émis à chaque changement de consentement.
 * Permet aux consommateurs hors arbre React (instrumentation-client → chargement
 * différé de Sentry) de réagir sans polling du cookie.
 */
export const CONSENT_CHANGE_EVENT = "cartora:consent-change";
