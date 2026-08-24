/**
 * Catalog typé des events de tracking de la landing page.
 *
 * Une seule source de vérité, partagée entre :
 *  - les composants clients (`TrackedCtaButton`, `SectionViewTracker`, `ScrollDepthTracker`)
 *  - la validation Zod côté `/api/track` (z.enum(LANDING_EVENT_NAMES))
 *  - le use case `RecordLandingEvent` (type `LandingEventName`)
 *
 * Deux familles : les CLICS (`cta_*`, `demo_link_click`, `faq_opened`, `locale_switched`)
 * et les IMPRESSIONS (`section_view` + metadata.section, `scroll_depth_*`) — les impressions
 * fournissent le dénominateur des CTR ; sans elles, impossible de mesurer un funnel ou un A/B.
 */
export const LANDING_EVENT_NAMES = [
  "cta_header_signup",
  "cta_header_login",
  "cta_hero_signup",
  "cta_hero_demo",
  "cta_how_signup",
  "cta_sticky_signup",
  "cta_pricing_free",
  "cta_pricing_starter",
  "cta_pricing_pro",
  "cta_final_signup",
  "cta_final_demo",
  "demo_link_click",
  "faq_opened",
  "section_view",
  "scroll_depth_25",
  "scroll_depth_50",
  "scroll_depth_75",
  "scroll_depth_100",
  "locale_switched",
] as const;

export type LandingEventName = (typeof LANDING_EVENT_NAMES)[number];
