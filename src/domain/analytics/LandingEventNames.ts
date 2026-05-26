/**
 * Catalog typé des events de tracking de la landing page.
 *
 * Une seule source de vérité, partagée entre :
 *  - le composant client `TrackedCtaButton` (autocomplete sur la prop `event`)
 *  - la validation Zod côté `/api/track` (z.enum(LANDING_EVENT_NAMES))
 *  - le use case `RecordLandingEvent` (type `LandingEventName`)
 *
 * Étendre cette liste UNIQUEMENT en cohérence avec la cartographie CTA de
 * docs/landing-plan.md (section 8 — Stratégie de conversion).
 */
export const LANDING_EVENT_NAMES = [
  "cta_header_signup",
  "cta_header_login",
  "cta_hero_signup",
  "cta_hero_demo",
  "cta_pricing_free",
  "cta_pricing_starter",
  "cta_pricing_pro",
  "cta_final_signup",
  "cta_final_demo",
  "faq_opened",
  "scroll_depth_75",
  "locale_switched",
] as const;

export type LandingEventName = (typeof LANDING_EVENT_NAMES)[number];
